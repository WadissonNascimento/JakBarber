"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  APPOINTMENT_STATUSES,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";
import {
  AppointmentMutationError,
  createManualFitInAppointment,
  setAppointmentItemDeliveryStatus,
  updateAppointmentStatusForBarber,
} from "@/lib/appointmentMutations";
import {
  notifyCustomerAppointmentCancelled,
  notifyCustomerAppointmentCompleted,
} from "@/lib/appointmentEmails";
import { notifyBarberNoShow } from "@/lib/barberEmails";
import {
  mutationError,
  mutationSuccess,
  type MutationResult,
} from "@/lib/mutationResult";
import { deleteLocalBarberPhoto, saveBarberPhoto } from "@/lib/barberPhoto";
import { getActiveBarberForSession } from "@/lib/barberAccess";
import { sanitizeEmailInput } from "@/lib/inputSanitization";
import { prisma } from "@/lib/prisma";
import {
  BRAZILIAN_PHONE_EXAMPLE,
  isValidBrazilianPhone,
  normalizeBrazilianPhoneForSubmit,
} from "@/lib/phone";
import { createScheduleDateTimeInput } from "@/lib/scheduleTime";
import { enforceRateLimit } from "@/lib/security";
import {
  isValidCustomerFullName,
  normalizeCustomerName,
} from "@/lib/customerRegistrationValidation";

async function requireBarber() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Nao autorizado.");
  }

  const barber = await getActiveBarberForSession(session.user);

  if (!barber) {
    throw new Error("Barbeiro inativo ou nao autorizado.");
  }

  return barber;
}

function isValidTimeRange(startTime: string, endTime: string) {
  return /^\d{2}:\d{2}$/.test(startTime) &&
    /^\d{2}:\d{2}$/.test(endTime) &&
    startTime < endTime;
}

function revalidateBarberViews() {
  revalidatePath("/barber");
  revalidatePath("/barber/agenda");
  revalidatePath("/barber/servicos");
  revalidatePath("/barber/disponibilidade");
  revalidatePath("/barber/clientes");
  revalidatePath("/agendar");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/barbeiros");
}

function parseItemDeliveryDecisions(formData: FormData) {
  return formData
    .getAll("itemDeliveryDecision")
    .map((value) => String(value))
    .map((value) => {
      const [appointmentItemId, deliveryStatus] = value.split(":");

      return {
        appointmentItemId: appointmentItemId?.trim() || "",
        isDelivered: deliveryStatus === "delivered",
      };
    })
    .filter((decision) => decision.appointmentItemId);
}

export async function updateOwnBarberPhotoAction(
  formData: FormData
): Promise<MutationResult | MutationResult<{ image: string }>> {
  const barber = await requireBarber();
  const file = formData.get("photo");

  if (!(file instanceof File)) {
    return mutationError("Escolha uma foto para enviar.");
  }

  const current = await prisma.user.findUnique({
    where: {
      id: barber.id,
    },
    select: {
      image: true,
    },
  });

  try {
    const image = await saveBarberPhoto(file);

    await prisma.user.update({
      where: {
        id: barber.id,
      },
      data: {
        image,
      },
    });

    await deleteLocalBarberPhoto(current?.image);
    revalidateBarberViews();

    return mutationSuccess("Foto atualizada com sucesso.", { image });
  } catch (error) {
    return mutationError(
      error instanceof Error ? error.message : "Nao foi possivel atualizar a foto."
    );
  }
}

export async function updateOwnBarberContactAction(
  formData: FormData
): Promise<MutationResult> {
  const barber = await requireBarber();
  const email = sanitizeEmailInput(formData.get("email")?.toString() || "");
  const rawPhone = formData.get("phone")?.toString() || "";
  const phone = rawPhone.trim()
    ? normalizeBrazilianPhoneForSubmit(rawPhone)
    : "";

  const rateLimit = await enforceRateLimit({
    scope: "barber:contact",
    identifier: barber.id,
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return mutationError("Muitas alteracoes em pouco tempo. Aguarde e tente novamente.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return mutationError("Informe um e-mail valido.");
  }

  if (rawPhone.trim() && !isValidBrazilianPhone(phone)) {
    return mutationError(`Use um telefone no formato ${BRAZILIAN_PHONE_EXAMPLE}.`);
  }

  const emailOwner = await prisma.user.findFirst({
    where: {
      email,
      NOT: {
        id: barber.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (emailOwner) {
    return mutationError("Este e-mail ja esta em uso.");
  }

  await prisma.user.update({
    where: {
      id: barber.id,
    },
    data: {
      email,
      phone: phone || null,
    },
  });

  revalidateBarberViews();
  revalidatePath("/barber");
  revalidatePath("/admin/barbeiros");
  revalidatePath(`/admin/barbeiros/${barber.id}`);

  return mutationSuccess("Contato atualizado com sucesso.");
}

export async function updateAppointmentStatusAction(
  formData: FormData
): Promise<MutationResult> {
  const barber = await requireBarber();
  const appointmentId = String(formData.get("appointmentId") || "");
  const status = normalizeAppointmentStatus(
    String(formData.get("status") || "")
  );
  const cancellationReason = String(
    formData.get("cancellationReason") || ""
  ).trim();
  const itemDeliveryDecisions =
    status === "COMPLETED" ? parseItemDeliveryDecisions(formData) : [];

  if (!appointmentId || !APPOINTMENT_STATUSES.includes(status as never)) {
    return mutationError("Status de agendamento invalido.");
  }

  if (status === "CANCELLED" && !cancellationReason) {
    return mutationError("Informe o motivo do cancelamento.");
  }

  const currentAppointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      barberId: barber.id,
    },
    select: {
      status: true,
    },
  });
  const previousStatus = currentAppointment
    ? normalizeAppointmentStatus(currentAppointment.status)
    : null;

  try {
    await updateAppointmentStatusForBarber({
      appointmentId,
      barberId: barber.id,
      status,
      cancellationReason,
      itemDeliveryDecisions,
    });
  } catch (error) {
    if (error instanceof AppointmentMutationError) {
      return mutationError(error.message);
    }

    throw error;
  }

  revalidateBarberViews();

  if (status === "COMPLETED" && previousStatus !== "COMPLETED") {
    await notifyCustomerAppointmentCompleted(appointmentId);
  }

  if (status === "CANCELLED" && previousStatus !== "CANCELLED") {
    await notifyCustomerAppointmentCancelled(appointmentId, cancellationReason);
  }

  if (status === "NO_SHOW" && previousStatus !== "NO_SHOW") {
    await notifyBarberNoShow(appointmentId);
  }

  return mutationSuccess("Status do agendamento atualizado.");
}

export async function setAppointmentItemDeliveryStatusAction(
  formData: FormData
): Promise<MutationResult> {
  const barber = await requireBarber();
  const appointmentItemId = String(formData.get("appointmentItemId") || "").trim();
  const isDelivered = String(formData.get("isDelivered") || "") === "true";

  if (!appointmentItemId) {
    return mutationError("Extra invalido.");
  }

  try {
    const result = await setAppointmentItemDeliveryStatus({
      appointmentItemId,
      barberId: barber.id,
      isDelivered,
    });

    revalidateBarberViews();
    revalidatePath("/customer/agendamentos");
    revalidatePath("/admin/agenda");

    return mutationSuccess(
      result.delivered
        ? `${result.productName} marcado como entregue.`
        : `${result.productName} marcado como não entregue.`
    );
  } catch (error) {
    if (error instanceof AppointmentMutationError) {
      return mutationError(error.message);
    }

    throw error;
  }
}

export async function createWalkInAppointmentAction(
  formData: FormData
): Promise<MutationResult> {
  const barber = await requireBarber();
  const customerId = String(formData.get("customerId") || "").trim();
  const customerName = normalizeCustomerName(String(formData.get("customerName") || ""));
  const rawCustomerPhone = String(formData.get("customerPhone") || "");
  const customerPhone = normalizeBrazilianPhoneForSubmit(rawCustomerPhone);
  const serviceIds = formData
    .getAll("serviceIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const legacyServiceId = String(formData.get("serviceId") || "").trim();
  const selectedServiceIds = serviceIds.length > 0 ? serviceIds : [legacyServiceId].filter(Boolean);
  const selectedExtras = formData
    .getAll("extraProductIds")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .map((extraProductId) => ({ extraProductId, quantity: 1 }));
  const date = String(formData.get("date") || "").trim();
  const startTime = String(formData.get("startTime") || "").trim();
  const extraNotes = String(formData.get("notes") || "").trim();

  const rateLimit = await enforceRateLimit({
    scope: "barber:walk_in",
    identifier: barber.id,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return mutationError("Muitos encaixes em pouco tempo. Aguarde e tente novamente.");
  }

  if (
    (!customerId && !isValidCustomerFullName(customerName)) ||
    (!customerId && !isValidBrazilianPhone(rawCustomerPhone)) ||
    (Boolean(rawCustomerPhone.trim()) && !customerPhone) ||
    customerName.length > 80 ||
    selectedServiceIds.length === 0 ||
    selectedServiceIds.length > 8 ||
    selectedExtras.length > 12 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(startTime) ||
    extraNotes.length > 200
  ) {
    return mutationError(
      "Preencha nome completo, telefone valido, servicos, data e horario corretamente."
    );
  }

  const services = await prisma.service.findMany({
    where: {
      id: {
        in: selectedServiceIds,
      },
      OR: [{ barberId: barber.id }, { barberId: null }],
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (services.length !== selectedServiceIds.length) {
    return mutationError("Um ou mais servicos estao indisponiveis para encaixe.");
  }

  const selectedCustomer = customerId
    ? await prisma.user.findFirst({
        where: {
          id: customerId,
          role: "CUSTOMER",
          customerAppointments: {
            some: {
              barberId: barber.id,
            },
          },
        },
        select: {
          id: true,
        },
      })
    : null;

  if (customerId && !selectedCustomer) {
    return mutationError("Cliente selecionado nao pertence a sua base.");
  }

  const existingCustomer = !selectedCustomer && customerPhone
    ? await prisma.user.findFirst({
        where: {
          phone: customerPhone,
          role: "CUSTOMER",
        },
        select: {
          id: true,
        },
      })
    : null;

  const customer =
    selectedCustomer ||
    existingCustomer ||
    (await prisma.user.create({
      data: {
        name: customerName,
        phone: customerPhone || null,
        role: "CUSTOMER",
        isActive: true,
      },
      select: {
        id: true,
      },
  }));

  try {
    await createManualFitInAppointment({
      customerId: customer.id,
      barberId: barber.id,
      serviceIds: selectedServiceIds,
      extras: selectedExtras,
      date,
      time: startTime,
      notes: `Encaixe Manual${extraNotes ? ` - ${extraNotes}` : ""}`,
      conflictMode: "SAME_START_ONLY",
    });
  } catch (error) {
    if (error instanceof AppointmentMutationError) {
      return mutationError(error.message);
    }

    throw error;
  }

  revalidateBarberViews();
  return mutationSuccess("Encaixe criado com sucesso!");
}

export async function saveBarberAvailabilityAction(
  formData: FormData
): Promise<MutationResult> {
  const barber = await requireBarber();
  const weekDay = Number(formData.get("weekDay") || -1);
  const startTime = String(formData.get("startTime") || "");
  const endTime = String(formData.get("endTime") || "");
  const isActive = String(formData.get("isActive") || "false") === "true";

  if (weekDay < 0 || weekDay > 6 || !isValidTimeRange(startTime, endTime)) {
    return mutationError("Disponibilidade invalida.");
  }

  await prisma.barberAvailability.upsert({
    where: {
      barberId_weekDay: {
        barberId: barber.id,
        weekDay,
      },
    },
    update: {
      startTime,
      endTime,
      isActive,
    },
    create: {
      barberId: barber.id,
      weekDay,
      startTime,
      endTime,
      isActive,
    },
  });

  revalidateBarberViews();
  return mutationSuccess("Disponibilidade atualizada.");
}

export async function saveWeeklyBarberAvailabilityAction(
  formData: FormData
): Promise<MutationResult> {
  const barber = await requireBarber();

  const entries = Array.from({ length: 7 }, (_, weekDay) => {
    const startTime = String(formData.get(`day-${weekDay}-startTime`) || "");
    const endTime = String(formData.get(`day-${weekDay}-endTime`) || "");
    const isActive =
      String(formData.get(`day-${weekDay}-isActive`) || "false") === "true";

    if (!isValidTimeRange(startTime, endTime)) {
      throw new Error(`Horario invalido para o dia ${weekDay}.`);
    }

    return {
      weekDay,
      startTime,
      endTime,
      isActive,
    };
  });

  try {
    await prisma.$transaction(
      entries.map((entry) =>
        prisma.barberAvailability.upsert({
          where: {
            barberId_weekDay: {
              barberId: barber.id,
              weekDay: entry.weekDay,
            },
          },
          update: {
            startTime: entry.startTime,
            endTime: entry.endTime,
            isActive: entry.isActive,
          },
          create: {
            barberId: barber.id,
            weekDay: entry.weekDay,
            startTime: entry.startTime,
            endTime: entry.endTime,
            isActive: entry.isActive,
          },
        })
      )
    );
  } catch (error) {
    if (error instanceof Error) {
      return mutationError(error.message);
    }

    throw error;
  }

  revalidateBarberViews();
  return mutationSuccess(
    "Disponibilidade da semana salva com sucesso."
  );
}

export async function createBarberBlockAction(
  formData: FormData
): Promise<MutationResult> {
  const barber = await requireBarber();
  const startDateTime = createScheduleDateTimeInput(
    String(formData.get("startDateTime") || "")
  );
  const endDateTime = createScheduleDateTimeInput(
    String(formData.get("endDateTime") || "")
  );
  const reason = String(formData.get("reason") || "").trim();

  if (
    !startDateTime ||
    !endDateTime ||
    startDateTime >= endDateTime
  ) {
    return mutationError("Periodo de bloqueio invalido.");
  }

  await prisma.barberBlock.create({
    data: {
      barberId: barber.id,
      startDateTime,
      endDateTime,
      reason: reason || null,
    },
  });

  revalidateBarberViews();
  return mutationSuccess("Bloqueio criado com sucesso.");
}

export async function createRecurringBarberBlockAction(
  formData: FormData
): Promise<MutationResult> {
  const barber = await requireBarber();
  const weekDay = Number(formData.get("weekDay") || -1);
  const startTime = String(formData.get("startTime") || "");
  const endTime = String(formData.get("endTime") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (weekDay < 0 || weekDay > 6 || !isValidTimeRange(startTime, endTime)) {
    return mutationError("Bloqueio recorrente invalido.");
  }

  await prisma.recurringBarberBlock.create({
    data: {
      barberId: barber.id,
      weekDay,
      startTime,
      endTime,
      reason: reason || null,
      isActive: true,
    },
  });

  revalidateBarberViews();
  return mutationSuccess(
    "Bloqueio recorrente criado com sucesso."
  );
}

export async function deleteRecurringBarberBlockAction(
  formData: FormData
): Promise<MutationResult> {
  const barber = await requireBarber();
  const recurringBlockId = String(formData.get("recurringBlockId") || "");

  const recurringBlock = await prisma.recurringBarberBlock.findUnique({
    where: { id: recurringBlockId },
  });

  if (!recurringBlock || recurringBlock.barberId !== barber.id) {
    return mutationError(
      "Bloqueio recorrente nao encontrado para este barbeiro."
    );
  }

  await prisma.recurringBarberBlock.delete({
    where: { id: recurringBlockId },
  });

  revalidateBarberViews();
  return mutationSuccess("Bloqueio recorrente removido.");
}

export async function deleteBarberBlockAction(
  formData: FormData
): Promise<MutationResult> {
  const barber = await requireBarber();
  const blockId = String(formData.get("blockId") || "");

  const block = await prisma.barberBlock.findUnique({
    where: { id: blockId },
  });

  if (!block || block.barberId !== barber.id) {
    return mutationError("Bloqueio nao encontrado para este barbeiro.");
  }

  await prisma.barberBlock.delete({
    where: { id: blockId },
  });

  revalidateBarberViews();
  return mutationSuccess("Bloqueio removido.");
}

export async function saveClientNoteAction(
  formData: FormData
): Promise<MutationResult> {
  const barber = await requireBarber();
  const customerId = String(formData.get("customerId") || "");
  const note = String(formData.get("note") || "").trim();

  if (!customerId || !note) {
    return mutationError("Anotacao invalida.");
  }

  const hasAppointment = await prisma.appointment.findFirst({
    where: {
      barberId: barber.id,
      customerId,
    },
    select: {
      id: true,
    },
  });

  if (!hasAppointment) {
    return mutationError("Cliente nao vinculado a este barbeiro.");
  }

  await prisma.clientNote.upsert({
    where: {
      barberId_customerId: {
        barberId: barber.id,
        customerId,
      },
    },
    update: {
      note,
    },
    create: {
      barberId: barber.id,
      customerId,
      note,
    },
  });

  revalidateBarberViews();
  revalidatePath(`/barber/clientes/${customerId}`);
  return mutationSuccess("Observacao salva com sucesso.");
}
