import { Prisma, type PrismaClient } from "@prisma/client";
import {
  APPOINTMENT_STATUSES,
  normalizeAppointmentStatus,
  type AppointmentStatus,
} from "@/lib/appointmentStatus";
import { registerExtraStockMovement } from "@/lib/extraInventory";
import {
  getAppointmentServicesOccupiedDuration,
  isActiveAppointmentStatus,
  isBlockedByRecurringBlock,
  isBlockedPeriod,
  toMinutes,
} from "@/lib/barberSchedule";
import {
  calculateCommissionFinancials,
  calculateServiceFinancials,
  syncAppointmentFinancialSnapshots,
} from "@/lib/financials";
import { prisma } from "@/lib/prisma";
import {
  createScheduleDate,
  getScheduleDayOfWeek,
  getScheduleDayRange,
  getScheduleMinutes,
  isScheduleDateTimePast,
} from "@/lib/scheduleTime";

type AppointmentPrismaClient = Pick<
  PrismaClient,
  | "$transaction"
  | "$executeRaw"
  | "appointment"
  | "appointmentItem"
  | "appointmentService"
  | "barberAvailability"
  | "barberBlock"
  | "barberServiceCommission"
  | "extraProduct"
  | "extraStockMovement"
  | "recurringBarberBlock"
  | "service"
  | "user"
>;
type AppointmentTransactionClient = Omit<AppointmentPrismaClient, "$transaction">;

export class AppointmentMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppointmentMutationError";
  }
}

export type CreateCustomerAppointmentInput = {
  customerId: string;
  barberId: string;
  serviceIds: string[];
  extras?: Array<{
    extraProductId: string;
    quantity: number;
  }>;
  date: string;
  time: string;
  notes?: string | null;
  now?: Date;
  conflictMode?: "OVERLAP" | "SAME_START_ONLY";
};

function getAppointmentDurationFromServices(
  services: Array<{
    duration: number;
    bufferAfter: number | null;
  }>
) {
  return getAppointmentServicesOccupiedDuration(
    services.map((service) => ({
      durationSnapshot: service.duration,
      bufferAfter: service.bufferAfter,
    }))
  );
}

export async function createCustomerAppointment(
  input: CreateCustomerAppointmentInput,
  db: AppointmentPrismaClient = prisma
) {
  try {
    return await db.$transaction(
      (tx) => createCustomerAppointmentInTransaction(input, tx),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 20000,
      }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2034" || error.code === "P2028")
    ) {
      throw new AppointmentMutationError(
        "Esse horario acabou de ser reservado. Escolha outro horario."
      );
    }

    throw error;
  }
}

async function createCustomerAppointmentInTransaction(
  input: CreateCustomerAppointmentInput,
  db: AppointmentTransactionClient
) {
  const barberId = input.barberId.trim();
  const serviceIds = input.serviceIds.map((serviceId) => serviceId.trim()).filter(Boolean);
  const extras = (input.extras || [])
    .map((extra) => ({
      extraProductId: extra.extraProductId.trim(),
      quantity: Number(extra.quantity),
    }))
    .filter(
      (extra) => extra.extraProductId && Number.isInteger(extra.quantity) && extra.quantity > 0
    );
  const date = input.date.trim();
  const time = input.time.trim();
  const notes = input.notes?.trim() || null;
  const conflictMode = input.conflictMode || "OVERLAP";

  if (!input.customerId || !barberId || serviceIds.length === 0 || !date || !time) {
    throw new AppointmentMutationError(
      "Selecione barbeiro, servicos, data e horario para continuar."
    );
  }

  if (serviceIds.length > 8 || extras.length > 12 || (notes && notes.length > 400)) {
    throw new AppointmentMutationError("Os dados do agendamento excedem o tamanho permitido.");
  }

  const extrasByProductId = new Map<string, number>();
  for (const extra of extras) {
    extrasByProductId.set(
      extra.extraProductId,
      (extrasByProductId.get(extra.extraProductId) || 0) + extra.quantity
    );
  }

  const barber = await db.user.findFirst({
    where: {
      id: barberId,
      role: "BARBER",
      isActive: true,
    },
  });

  if (!barber) {
    throw new AppointmentMutationError("O barbeiro selecionado nao esta mais disponivel.");
  }

  const availableServices = await db.service.findMany({
    where: {
      id: {
        in: serviceIds,
      },
      OR: [{ barberId }, { barberId: null }],
      isActive: true,
    },
  });

  if (availableServices.length !== serviceIds.length) {
    throw new AppointmentMutationError(
      "Um ou mais servicos escolhidos nao estao disponiveis para esse barbeiro."
    );
  }

  const serviceMap = new Map(availableServices.map((service) => [service.id, service] as const));
  const orderedServices = serviceIds
    .map((serviceId) => serviceMap.get(serviceId))
    .filter(
      (
        service
      ): service is (typeof availableServices)[number] => Boolean(service)
    );

  if (orderedServices.length !== serviceIds.length) {
    throw new AppointmentMutationError(
      "Nao foi possivel validar a ordem dos servicos selecionados."
    );
  }

  const barberServiceCommissions = await db.barberServiceCommission.findMany({
    where: {
      barberId,
      serviceId: {
        in: serviceIds,
      },
    },
  });
  const commissionByServiceId = new Map(
    barberServiceCommissions.map((commission) => [commission.serviceId, commission] as const)
  );

  const selectedProducts = extrasByProductId.size
    ? await db.extraProduct.findMany({
        where: {
          id: {
            in: Array.from(extrasByProductId.keys()),
          },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          commissionType: true,
          commissionValue: true,
        },
      })
    : [];

  if (selectedProducts.length !== extrasByProductId.size) {
    throw new AppointmentMutationError(
      "Um ou mais extras escolhidos nao estao mais disponiveis."
    );
  }

  for (const product of selectedProducts) {
    const selectedQuantity = extrasByProductId.get(product.id) || 0;

    if (selectedQuantity > product.stock) {
      throw new AppointmentMutationError(
        `${product.name} nao possui estoque suficiente para esse agendamento.`
      );
    }
  }

  const appointmentDate = createScheduleDate(date, time);

  if (!appointmentDate) {
    throw new AppointmentMutationError("Data ou horario invalido.");
  }

  const now = input.now ?? new Date();
  if (isScheduleDateTimePast(appointmentDate, now)) {
    throw new AppointmentMutationError("Nao e possivel agendar em um horario que ja passou.");
  }

  const dayOfWeek = getScheduleDayOfWeek(date);
  const dayRange = getScheduleDayRange(date);

  if (dayOfWeek === null || !dayRange) {
    throw new AppointmentMutationError("Data ou horario invalido.");
  }

  const { start: dayStart, end: dayEnd } = dayRange;

  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${barberId}), hashtext(${date}))`;

  const [availability, sameDayAppointments, blocks, recurringBlocks] = await Promise.all([
    db.barberAvailability.findFirst({
      where: {
        barberId,
        weekDay: dayOfWeek,
        isActive: true,
      },
    }),
    db.appointment.findMany({
      where: {
        barberId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        services: true,
      },
    }),
    db.barberBlock.findMany({
      where: {
        barberId,
        startDateTime: {
          lte: dayEnd,
        },
        endDateTime: {
          gte: dayStart,
        },
      },
    }),
    db.recurringBarberBlock.findMany({
      where: {
        barberId,
        weekDay: dayOfWeek,
        isActive: true,
      },
    }),
  ]);

  if (!availability) {
    throw new AppointmentMutationError("Este barbeiro nao atende nesse dia.");
  }

  const occupiedDuration = getAppointmentDurationFromServices(orderedServices);
  const selectedStartMinutes = toMinutes(time);
  const selectedEndMinutes = selectedStartMinutes + occupiedDuration;
  const availabilityStart = toMinutes(availability.startTime);
  const availabilityEnd = toMinutes(availability.endTime);

  if (selectedStartMinutes < availabilityStart || selectedEndMinutes > availabilityEnd) {
    throw new AppointmentMutationError(
      "O horario escolhido esta fora da disponibilidade do barbeiro."
    );
  }

  const endDate = new Date(appointmentDate.getTime() + occupiedDuration * 60000);

  if (isBlockedPeriod(appointmentDate, endDate, blocks)) {
    throw new AppointmentMutationError("O horario escolhido esta bloqueado pelo barbeiro.");
  }

  if (isBlockedByRecurringBlock(selectedStartMinutes, selectedEndMinutes, recurringBlocks)) {
    throw new AppointmentMutationError(
      "O horario escolhido entra em um bloqueio recorrente do barbeiro."
    );
  }

  const conflict = sameDayAppointments.some((appointment) => {
    if (!isActiveAppointmentStatus(appointment.status)) {
      return false;
    }

    const existingDate = new Date(appointment.date);
    const existingStartMinutes = getScheduleMinutes(existingDate);

    if (conflictMode === "SAME_START_ONLY") {
      return selectedStartMinutes === existingStartMinutes;
    }

    const existingEndMinutes =
      existingStartMinutes + getAppointmentServicesOccupiedDuration(appointment.services);

    return selectedStartMinutes < existingEndMinutes && selectedEndMinutes > existingStartMinutes;
  });

  if (conflict) {
    throw new AppointmentMutationError(
      "Esse horario acabou de ser reservado. Escolha outro horario."
    );
  }

  const appointment = await db.appointment.create({
    data: {
      barberId,
      customerId: input.customerId,
      date: appointmentDate,
      notes,
      status: "PENDING",
      services: {
        create: orderedServices.map((service, index) => {
          const barberCommission = commissionByServiceId.get(service.id);
          const financials = calculateServiceFinancials({
            price: service.price,
            commissionType: barberCommission?.commissionType || service.commissionType,
            commissionValue: barberCommission?.commissionValue ?? service.commissionValue,
          });

          return {
            serviceId: service.id,
            orderIndex: index,
            nameSnapshot: service.name,
            priceSnapshot: service.price,
            durationSnapshot: service.duration,
            bufferAfter: service.bufferAfter || 0,
            commissionTypeSnapshot: financials.commissionType,
            commissionValueSnapshot: financials.commissionValue,
            barberPayoutSnapshot: financials.barberPayout,
            shopRevenueSnapshot: financials.shopRevenue,
          };
        }),
      },
    },
    include: {
      items: true,
      services: true,
      barber: true,
      customer: true,
    },
  });

  if (selectedProducts.length > 0) {
    for (const product of selectedProducts) {
      const quantity = extrasByProductId.get(product.id) || 0;
      const updated = await db.extraProduct.updateMany({
        where: {
          id: product.id,
          isActive: true,
          stock: {
            gte: quantity,
          },
        },
        data: {
          stock: {
            decrement: quantity,
          },
        },
      });

      if (updated.count === 0) {
        throw new AppointmentMutationError(
          `${product.name} acabou de ficar sem estoque. Tente novamente.`
        );
      }
    }

    await db.appointmentItem.createMany({
      data: selectedProducts.map((product) => {
        const quantity = extrasByProductId.get(product.id) || 0;
        const unitFinancials = calculateCommissionFinancials({
          price: product.price,
          commissionType: product.commissionType,
          commissionValue: product.commissionValue,
        });
        const barberPayout = Number((unitFinancials.barberPayout * quantity).toFixed(2));
        const shopRevenue = Number((unitFinancials.shopRevenue * quantity).toFixed(2));

        return {
          appointmentId: appointment.id,
          extraProductId: product.id,
          productNameSnapshot: product.name,
          quantity,
          unitPrice: product.price,
          subtotal: product.price * quantity,
          commissionTypeSnapshot: unitFinancials.commissionType,
          commissionValueSnapshot: unitFinancials.commissionValue,
          barberPayoutSnapshot: barberPayout,
          shopRevenueSnapshot: shopRevenue,
        };
      }),
    });

    for (const product of selectedProducts) {
      const quantity = extrasByProductId.get(product.id) || 0;
      await registerExtraStockMovement(
        {
          extraProductId: product.id,
          type: "RESERVE_OUT",
          quantity,
          reason: `Reserva em agendamento ${appointment.id}`,
        },
        db
      );
    }
  }

  return db.appointment.findUniqueOrThrow({
    where: {
      id: appointment.id,
    },
    include: {
      items: true,
      services: true,
      barber: true,
      customer: true,
    },
  });
}

export async function updateAppointmentStatusForBarber(
  {
    appointmentId,
    barberId,
    status,
  }: {
    appointmentId: string;
    barberId: string;
    status: string;
  },
  db: AppointmentPrismaClient = prisma
) {
  const normalizedStatus = normalizeAppointmentStatus(status) as AppointmentStatus;

  if (!appointmentId || !APPOINTMENT_STATUSES.includes(normalizedStatus)) {
    throw new AppointmentMutationError("Status de agendamento invalido.");
  }

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment || appointment.barberId !== barberId) {
    throw new AppointmentMutationError(
      "Agendamento nao encontrado para este barbeiro."
    );
  }

  const updatedAppointment = await db.$transaction(
    (tx) =>
      updateAppointmentStatusWithSideEffects(
        {
          appointmentId,
          nextStatus: normalizedStatus,
          cancellationReason: "Cancelado pelo barbeiro.",
        },
        tx
      ),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 20000,
    }
  );

  if (normalizedStatus === "COMPLETED") {
    await syncAppointmentFinancialSnapshots(appointmentId, db);
  }

  return updatedAppointment;
}

export async function cancelAppointmentByCustomer(
  {
    appointmentId,
    customerId,
  }: {
    appointmentId: string;
    customerId: string;
  },
  db: AppointmentPrismaClient = prisma
) {
  return db.$transaction(
    async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          customerId: true,
          status: true,
          date: true,
        },
      });

      if (!appointment || appointment.customerId !== customerId) {
        throw new AppointmentMutationError("Agendamento nao encontrado para sua conta.");
      }

      if (["CANCELLED", "COMPLETED", "DONE", "NO_SHOW"].includes(appointment.status)) {
        throw new AppointmentMutationError("Esse agendamento nao pode mais ser cancelado.");
      }

      if (isScheduleDateTimePast(appointment.date)) {
        throw new AppointmentMutationError(
          "Esse horario ja passou. Fale com o barbeiro para ajustar o status."
        );
      }

      await updateAppointmentStatusWithSideEffects(
        {
          appointmentId,
          nextStatus: "CANCELLED",
          cancellationReason: "Cancelado pelo cliente.",
        },
        tx
      );
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 20000,
    }
  );
}

export async function toggleAppointmentItemsDelivered(
  {
    appointmentId,
    barberId,
    isAdmin = false,
  }: {
    appointmentId: string;
    barberId?: string;
    isAdmin?: boolean;
  },
  db: AppointmentPrismaClient = prisma
) {
  return db.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        items: true,
      },
    });

    if (!appointment) {
      throw new AppointmentMutationError("Agendamento nao encontrado.");
    }

    if (!isAdmin && appointment.barberId !== barberId) {
      throw new AppointmentMutationError("Agendamento nao encontrado para este barbeiro.");
    }

    if (appointment.items.length === 0) {
      throw new AppointmentMutationError("Esse agendamento nao possui extras.");
    }

    const shouldDeliver = appointment.items.some((item) => !item.isDelivered);

    await tx.appointmentItem.updateMany({
      where: {
        appointmentId,
      },
      data: {
        isDelivered: shouldDeliver,
        deliveredAt: shouldDeliver ? new Date() : null,
      },
    });

    return {
      delivered: shouldDeliver,
    };
  });
}

async function updateAppointmentStatusWithSideEffects(
  {
    appointmentId,
    nextStatus,
    cancellationReason,
  }: {
    appointmentId: string;
    nextStatus: AppointmentStatus;
    cancellationReason?: string;
  },
  db: AppointmentTransactionClient
) {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      items: true,
    },
  });

  if (!appointment) {
    throw new AppointmentMutationError("Agendamento nao encontrado.");
  }

  if (nextStatus === "CANCELLED" && appointment.status !== "CANCELLED") {
    for (const item of appointment.items) {
      await db.extraProduct.update({
        where: {
          id: item.extraProductId,
        },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });

      await registerExtraStockMovement(
        {
          extraProductId: item.extraProductId,
          type: "CANCEL_RETURN",
          quantity: item.quantity,
          reason: `Devolucao por cancelamento do agendamento ${appointment.id}`,
        },
        db
      );
    }
  }

  return db.appointment.update({
    where: { id: appointmentId },
    data: {
      status: nextStatus,
      notes:
        nextStatus === "CANCELLED" && cancellationReason
          ? [appointment.notes, cancellationReason].filter(Boolean).join(" | ")
          : appointment.notes,
    },
  });
}
