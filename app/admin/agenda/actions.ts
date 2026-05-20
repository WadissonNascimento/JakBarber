"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  APPOINTMENT_STATUSES,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";
import {
  AppointmentMutationError,
  editAppointmentForAdmin,
  editCompletedAppointmentFinancialItems,
  updateAppointmentStatusForAdmin,
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
import { prisma } from "@/lib/prisma";
import { normalizePaymentMethod } from "@/lib/paymentMethods";
import { logSecurityEvent } from "@/lib/security";

async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Nao autorizado.");
  }

  return session.user;
}

function revalidateAgendaViews(barberId?: string | null) {
  revalidatePath("/admin/agenda");
  revalidatePath("/admin");
  revalidatePath("/admin/financeiro");
  revalidatePath("/barber");
  revalidatePath("/barber/agenda");
  revalidatePath("/barber/financeiro");
  revalidatePath("/customer/agendamentos");
  revalidatePath("/meu-perfil");

  if (barberId) {
    revalidatePath(`/admin/barbeiros/${barberId}/repasse-hoje`);
    revalidatePath(`/admin/barbeiros/${barberId}/repasse-semana`);
  }
}

function parseSelectedExtras(formData: FormData) {
  return formData
    .getAll("extraProductIds")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .map((extraProductId) => ({ extraProductId, quantity: 1 }));
}

export async function updateAdminAppointmentStatusAction(
  formData: FormData
): Promise<MutationResult> {
  const admin = await requireAdmin();
  const appointmentId = String(formData.get("appointmentId") || "").trim();
  const status = normalizeAppointmentStatus(String(formData.get("status") || ""));
  const paymentMethod = normalizePaymentMethod(formData.get("paymentMethod"));
  const cancellationReason = String(formData.get("cancellationReason") || "").trim();

  if (!appointmentId || !APPOINTMENT_STATUSES.includes(status as never)) {
    return mutationError("Status de agendamento invalido.");
  }

  if (status === "CANCELLED" && !cancellationReason) {
    return mutationError("Informe o motivo do cancelamento.");
  }

  const currentAppointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      status: true,
      barberId: true,
    },
  });
  const previousStatus = currentAppointment
    ? normalizeAppointmentStatus(currentAppointment.status)
    : null;

  try {
    const itemDeliveryDecisions =
      status === "COMPLETED"
        ? (
            await prisma.appointmentItem.findMany({
              where: {
                appointmentId,
              },
              select: {
                id: true,
              },
            })
          ).map((item) => ({
            appointmentItemId: item.id,
            isDelivered: true,
          }))
        : [];

    await updateAppointmentStatusForAdmin({
      appointmentId,
      status,
      paymentMethod,
      cancellationReason,
      itemDeliveryDecisions,
    });
  } catch (error) {
    if (error instanceof AppointmentMutationError) {
      return mutationError(error.message);
    }

    throw error;
  }

  logSecurityEvent("admin_appointment_status_updated", {
    adminId: admin.id,
    appointmentId,
    previousStatus,
    nextStatus: status,
  });

  after(async () => {
    revalidateAgendaViews(currentAppointment?.barberId);

    if (status === "COMPLETED" && previousStatus !== "COMPLETED") {
      await notifyCustomerAppointmentCompleted(appointmentId);
    }

    if (status === "CANCELLED" && previousStatus !== "CANCELLED") {
      await notifyCustomerAppointmentCancelled(appointmentId, cancellationReason);
    }

    if (status === "NO_SHOW" && previousStatus !== "NO_SHOW") {
      await notifyBarberNoShow(appointmentId);
    }
  });

  return mutationSuccess("Agendamento atualizado pelo admin.");
}

export async function editAdminAppointmentAction(
  formData: FormData
): Promise<MutationResult> {
  const admin = await requireAdmin();
  const appointmentId = String(formData.get("appointmentId") || "").trim();
  const barberId = String(formData.get("barberId") || "").trim();
  const date = String(formData.get("date") || "").trim();
  const time = String(formData.get("time") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const serviceIds = formData
    .getAll("serviceIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const extras = parseSelectedExtras(formData);

  if (
    !appointmentId ||
    serviceIds.length === 0 ||
    serviceIds.length > 8 ||
    extras.length > 12 ||
    notes.length > 400
  ) {
    return mutationError("Selecione servicos, extras e observacoes corretamente.");
  }

  if (!admin.shopId) {
    return mutationError("Admin sem barbearia vinculada.");
  }

  const currentAppointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      shopId: admin.shopId,
    },
    select: {
      status: true,
      barberId: true,
    },
  });

  if (!currentAppointment) {
    return mutationError("Agendamento nao encontrado.");
  }

  const currentStatus = normalizeAppointmentStatus(currentAppointment.status);
  const isCompletedEdit = ["COMPLETED", "DONE"].includes(currentStatus);

  if (
    !isCompletedEdit &&
    (!barberId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{2}:\d{2}$/.test(time))
  ) {
    return mutationError("Preencha barbeiro, data, horario e servicos corretamente.");
  }

  try {
    if (isCompletedEdit) {
      await editCompletedAppointmentFinancialItems({
        appointmentId,
        actor: "ADMIN",
        shopId: admin.shopId,
        serviceIds,
        extras,
        notes,
      });
    } else {
      await editAppointmentForAdmin({
        appointmentId,
        barberId,
        serviceIds,
        extras,
        date,
        time,
        notes,
      });
    }
  } catch (error) {
    if (error instanceof AppointmentMutationError) {
      return mutationError(error.message);
    }

    throw error;
  }

  logSecurityEvent("admin_appointment_edited", {
    adminId: admin.id,
    appointmentId,
    barberId,
    serviceCount: serviceIds.length,
    extraCount: extras.length,
    date,
    time,
    mode: isCompletedEdit ? "completed_finance_items" : "operational",
  });

  revalidateAgendaViews(isCompletedEdit ? currentAppointment.barberId : barberId);

  return mutationSuccess(
    isCompletedEdit
      ? "Atendimento atualizado no financeiro."
      : "Agendamento editado pelo admin."
  );
}
