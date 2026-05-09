import { prisma } from "@/lib/prisma";
import { getAppointmentServicesOccupiedDuration } from "@/lib/barberSchedule";
import {
  getAppointmentDisplayName,
  getAppointmentGrandTotal,
  getAppointmentServiceRevenue,
  getAppointmentServiceMetaLine,
  getAppointmentTotalBarberPayout,
} from "@/lib/appointmentServices";
import { normalizeAppointmentStatus } from "@/lib/appointmentStatus";
import {
  appointmentCustomerHistorySelect,
  appointmentForBarberSelect,
  appointmentForTotalsSelect,
} from "@/lib/appointmentSelects";
import {
  createScheduleDayStart,
  getCurrentScheduleDate,
  getCurrentScheduleDateValue,
  getScheduleDateValue,
  getScheduleDayRange,
} from "@/lib/scheduleTime";
import { toMoneyNumber, type MoneyValue } from "@/lib/money";

export type BarberDashboardFilters = {
  view?: "day" | "today" | "upcoming" | "all";
  status?: string;
  date?: string;
};

function normalizeDashboardView(
  view?: BarberDashboardFilters["view"]
): "day" | "upcoming" | "all" {
  if (view === "upcoming" || view === "all") {
    return view;
  }

  return "day";
}

function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.toLowerCase());
}

function getDayRange(date: string) {
  return getScheduleDayRange(date) || getScheduleDayRange(getCurrentScheduleDateValue())!;
}

function getSelectedDate(filters: BarberDashboardFilters) {
  if (filters.date) {
    const parsed = createScheduleDayStart(filters.date);
    if (parsed) {
      return parsed;
    }
  }

  return createScheduleDayStart(getCurrentScheduleDateValue())!;
}

function getAppointmentCardItems(
  items: Array<{
    id: string;
    productNameSnapshot: string;
    quantity: number;
    isDelivered: boolean;
    deliveredAt: Date | null;
  }>
) {
  return items.map((item) => ({
    id: item.id,
    productNameSnapshot: item.productNameSnapshot,
    quantity: item.quantity,
    isDelivered: item.isDelivered,
    deliveredAt: item.deliveredAt,
  }));
}

function serializeServicesForClient<
  T extends {
    price: MoneyValue;
    commissionValue?: MoneyValue;
  }
>(services: T[]) {
  return services.map((service) => ({
    ...service,
    price: toMoneyNumber(service.price),
    ...(service.commissionValue === undefined
      ? {}
      : { commissionValue: toMoneyNumber(service.commissionValue) }),
  }));
}

function buildClientsFromHistory(
  clientNotes: Array<{
    customerId: string;
    note: string;
  }>,
  appointments: Array<{
    customerId: string;
    date: Date;
    customer: {
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
    };
  }>
) {
  const noteMap = new Map(
    clientNotes.map((note) => [note.customerId, note.note] as const)
  );
  const clientsMap = new Map<
    string,
    {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      lastAppointment: Date;
      totalAppointments: number;
      note: string;
    }
  >();

  for (const appointment of appointments) {
    if (!clientsMap.has(appointment.customerId)) {
      clientsMap.set(appointment.customerId, {
        id: appointment.customer.id,
        name: appointment.customer.name || "Cliente",
        email: appointment.customer.email || null,
        phone: appointment.customer.phone || null,
        lastAppointment: appointment.date,
        totalAppointments: 1,
        note: noteMap.get(appointment.customerId) || "",
      });
      continue;
    }

    const existing = clientsMap.get(appointment.customerId)!;
    existing.totalAppointments += 1;
  }

  return Array.from(clientsMap.values());
}

export async function getBarberDashboardData(
  barberId: string,
  filters: BarberDashboardFilters
) {
  const view = normalizeDashboardView(filters.view);
  const selectedDate = getSelectedDate(filters);
  const currentScheduleDate = getCurrentScheduleDate();
  const { start: selectedStart, end: selectedEnd } = getDayRange(
    getScheduleDateValue(selectedDate)
  );
  const { start: todayStart, end: todayEnd } = getDayRange(
    getCurrentScheduleDateValue()
  );
  const rawStatus = filters.status || "ACTIVE";
  const status = rawStatus === "ACTIVE" ? "ACTIVE" : normalizeAppointmentStatus(rawStatus);

  const appointmentWhere =
    view === "all"
      ? {
          barberId,
        }
      : view === "upcoming"
      ? {
          barberId,
          date: {
            gte: currentScheduleDate,
          },
        }
      : {
          barberId,
          date: {
            gte: selectedStart,
            lte: selectedEnd,
          },
        };

  const appointments = await prisma.appointment.findMany({
    where: {
      ...appointmentWhere,
      ...(status === "ACTIVE"
        ? { status: { notIn: ["CANCELLED"] } }
        : status !== "ALL"
        ? { status }
        : {}),
    },
    select: appointmentForBarberSelect,
    orderBy: {
      date: "asc",
    },
  });

  const [
    appointmentsToday,
    completedToday,
    todayAppointments,
    upcomingAppointments,
    services,
    availabilities,
    blocks,
    recurringBlocks,
    clientNotes,
    allBarberAppointments,
    walkInServices,
  ] =
    await Promise.all([
      prisma.appointment.count({
        where: {
          barberId,
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
          status: {
            notIn: ["CANCELLED"],
          },
        },
      }),
      prisma.appointment.count({
        where: {
          barberId,
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
          status: {
            in: ["COMPLETED", "DONE"],
          },
        },
      }),
      prisma.appointment.findMany({
        where: {
          barberId,
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
          status: {
            notIn: ["CANCELLED"],
          },
        },
        select: appointmentForBarberSelect,
        orderBy: {
          date: "asc",
        },
      }),
      prisma.appointment.findMany({
        where: {
          barberId,
          date: {
            gte: currentScheduleDate,
          },
          status: {
            notIn: ["CANCELLED", "COMPLETED", "DONE", "NO_SHOW"],
          },
        },
        select: appointmentForBarberSelect,
        orderBy: {
          date: "asc",
        },
        take: 3,
      }),
      prisma.service.findMany({
        where: {
          barberId,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.barberAvailability.findMany({
        where: { barberId },
        orderBy: {
          weekDay: "asc",
        },
      }),
      prisma.barberBlock.findMany({
        where: {
          barberId,
          endDateTime: {
            gte: currentScheduleDate,
          },
        },
        orderBy: {
          startDateTime: "asc",
        },
      }),
      prisma.recurringBarberBlock.findMany({
        where: {
          barberId,
        },
        orderBy: [
          {
            weekDay: "asc",
          },
          {
            startTime: "asc",
          },
        ],
      }),
      prisma.clientNote.findMany({
        where: { barberId },
        select: {
          customerId: true,
          note: true,
        },
      }),
      prisma.appointment.findMany({
        where: { barberId },
        select: appointmentCustomerHistorySelect,
        orderBy: {
          date: "desc",
        },
      }),
      prisma.service.findMany({
        where: {
          OR: [{ barberId }, { barberId: null }],
          isActive: true,
        },
        orderBy: [
          {
            barberId: "desc",
          },
          {
            name: "asc",
          },
        ],
      }),
    ]);

  const normalizedTodayAppointments = todayAppointments.map((appointment) => ({
    ...appointment,
    status: normalizeAppointmentStatus(appointment.status),
  }));
  const activeTodayAppointments = normalizedTodayAppointments.filter(
    (appointment) =>
      !["CANCELLED", "NO_SHOW"].includes(appointment.status)
  );
  const completedTodayAppointments = normalizedTodayAppointments.filter(
    (appointment) => appointment.status === "COMPLETED"
  );
  const todayServiceMap = new Map<string, number>();

  for (const appointment of activeTodayAppointments) {
    const serviceName = getAppointmentDisplayName(appointment.services);
    todayServiceMap.set(serviceName, (todayServiceMap.get(serviceName) || 0) + 1);
  }

  const todayServices = Array.from(todayServiceMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    filters: {
      view,
      status,
      date: view === "day" ? getScheduleDateValue(selectedDate) : "",
    },
    summary: {
      appointmentsToday,
      completedToday,
      clientsToday: new Set(activeTodayAppointments.map((appointment) => appointment.customerId)).size,
      scheduledRevenueToday: activeTodayAppointments.reduce(
        (sum, appointment) => sum + getAppointmentGrandTotal(appointment.services, appointment.items),
        0
      ),
      completedRevenueToday: completedTodayAppointments.reduce(
        (sum, appointment) =>
          sum +
          getAppointmentGrandTotal(
            appointment.services,
            appointment.items.filter((item) => item.isDelivered)
          ),
        0
      ),
      barberPayoutToday: completedTodayAppointments.reduce(
        (sum, appointment) =>
          sum + getAppointmentTotalBarberPayout(appointment.services, appointment.items),
        0
      ),
      todayServices,
      todayAppointments: normalizedTodayAppointments.map((appointment) => ({
        id: appointment.id,
        publicId: appointment.publicId,
        date: appointment.date,
        status: appointment.status,
        notes: appointment.notes,
        customer: {
          id: appointment.customer.id,
          name: appointment.customer.name || "Cliente",
          phone: appointment.customer.phone || null,
          email: appointment.customer.email || null,
        },
        serviceName: getAppointmentDisplayName(appointment.services),
        serviceMeta: getAppointmentServiceMetaLine(appointment.services),
        items: getAppointmentCardItems(appointment.items),
        totalPrice: getAppointmentGrandTotal(appointment.services, appointment.items),
        serviceRevenue: getAppointmentServiceRevenue(appointment.services),
        occupiedDuration: getAppointmentServicesOccupiedDuration(appointment.services),
      })),
      nextAppointments: upcomingAppointments.map((appointment) => ({
        id: appointment.id,
        publicId: appointment.publicId,
        date: appointment.date,
        status: normalizeAppointmentStatus(appointment.status),
        notes: appointment.notes,
        customer: {
          id: appointment.customer.id,
          name: appointment.customer.name || "Cliente",
          phone: appointment.customer.phone || null,
          email: appointment.customer.email || null,
        },
        serviceName: getAppointmentDisplayName(appointment.services),
        serviceMeta: getAppointmentServiceMetaLine(appointment.services),
        items: getAppointmentCardItems(appointment.items),
        totalPrice: getAppointmentGrandTotal(appointment.services, appointment.items),
        serviceRevenue: getAppointmentServiceRevenue(appointment.services),
        occupiedDuration: getAppointmentServicesOccupiedDuration(appointment.services),
      })),
    },
    appointments: appointments.map((appointment) => ({
      ...appointment,
      status: normalizeAppointmentStatus(appointment.status),
    })),
    services: serializeServicesForClient(services),
    walkInServices: serializeServicesForClient(walkInServices),
    availabilities,
    blocks,
    recurringBlocks,
    clients: buildClientsFromHistory(clientNotes, allBarberAppointments),
  };
}

export async function getBarberTodayDashboardData(barberId: string) {
  const { start: todayStart, end: todayEnd } = getDayRange(
    getCurrentScheduleDateValue()
  );

  const [
    appointmentsToday,
    completedToday,
    todayAppointments,
    walkInServices,
    clientNotes,
    allBarberAppointments,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        barberId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          notIn: ["CANCELLED"],
        },
      },
    }),
    prisma.appointment.count({
      where: {
        barberId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          in: ["COMPLETED", "DONE"],
        },
      },
    }),
    prisma.appointment.findMany({
      where: {
        barberId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          notIn: ["CANCELLED"],
        },
      },
      select: appointmentForBarberSelect,
      orderBy: {
        date: "asc",
      },
    }),
    prisma.service.findMany({
      where: {
        OR: [{ barberId }, { barberId: null }],
        isActive: true,
      },
      orderBy: [
        {
          barberId: "desc",
        },
        {
          name: "asc",
        },
      ],
    }),
    prisma.clientNote.findMany({
      where: { barberId },
      select: {
        customerId: true,
        note: true,
      },
    }),
    prisma.appointment.findMany({
      where: { barberId },
      select: appointmentCustomerHistorySelect,
      orderBy: {
        date: "desc",
      },
    }),
  ]);

  const normalizedTodayAppointments = todayAppointments.map((appointment) => ({
    ...appointment,
    status: normalizeAppointmentStatus(appointment.status),
  }));
  const activeTodayAppointments = normalizedTodayAppointments.filter(
    (appointment) =>
      !["CANCELLED", "NO_SHOW"].includes(appointment.status)
  );
  const completedTodayAppointments = normalizedTodayAppointments.filter(
    (appointment) => appointment.status === "COMPLETED"
  );
  const todayServiceMap = new Map<string, number>();

  for (const appointment of activeTodayAppointments) {
    const serviceName = getAppointmentDisplayName(appointment.services);
    todayServiceMap.set(serviceName, (todayServiceMap.get(serviceName) || 0) + 1);
  }

  const todayServices = Array.from(todayServiceMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    summary: {
      appointmentsToday,
      completedToday,
      clientsToday: new Set(activeTodayAppointments.map((appointment) => appointment.customerId)).size,
      scheduledRevenueToday: activeTodayAppointments.reduce(
        (sum, appointment) => sum + getAppointmentGrandTotal(appointment.services, appointment.items),
        0
      ),
      completedRevenueToday: completedTodayAppointments.reduce(
        (sum, appointment) =>
          sum +
          getAppointmentGrandTotal(
            appointment.services,
            appointment.items.filter((item) => item.isDelivered)
          ),
        0
      ),
      barberPayoutToday: completedTodayAppointments.reduce(
        (sum, appointment) =>
          sum + getAppointmentTotalBarberPayout(appointment.services, appointment.items),
        0
      ),
      todayServices,
      todayAppointments: normalizedTodayAppointments.map((appointment) => ({
        id: appointment.id,
        publicId: appointment.publicId,
        date: appointment.date,
        status: appointment.status,
        notes: appointment.notes,
        customer: {
          id: appointment.customer.id,
          name: appointment.customer.name || "Cliente",
          phone: appointment.customer.phone || null,
          email: appointment.customer.email || null,
        },
        serviceName: getAppointmentDisplayName(appointment.services),
        serviceMeta: getAppointmentServiceMetaLine(appointment.services),
        items: getAppointmentCardItems(appointment.items),
        totalPrice: getAppointmentGrandTotal(appointment.services, appointment.items),
        serviceRevenue: getAppointmentServiceRevenue(appointment.services),
        occupiedDuration: getAppointmentServicesOccupiedDuration(appointment.services),
      })),
      nextAppointments: [],
    },
    walkInServices: serializeServicesForClient(walkInServices),
    clients: buildClientsFromHistory(clientNotes, allBarberAppointments),
  };
}

export async function getBarberAvailabilityData(barberId: string) {
  const currentScheduleDate = getCurrentScheduleDate();
  const [availabilities, blocks, recurringBlocks] = await Promise.all([
    prisma.barberAvailability.findMany({
      where: { barberId },
      orderBy: {
        weekDay: "asc",
      },
    }),
    prisma.barberBlock.findMany({
      where: {
        barberId,
        endDateTime: {
          gte: currentScheduleDate,
        },
      },
      orderBy: {
        startDateTime: "asc",
      },
    }),
    prisma.recurringBarberBlock.findMany({
      where: {
        barberId,
      },
      orderBy: [
        {
          weekDay: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    }),
  ]);

  return {
    availabilities,
    blocks,
    recurringBlocks,
  };
}

export async function getBarberClientsDirectory(barberId: string, search = "") {
  const [clientNotes, allBarberAppointments] = await Promise.all([
    prisma.clientNote.findMany({
      where: { barberId },
      select: {
        customerId: true,
        note: true,
      },
    }),
    prisma.appointment.findMany({
      where: { barberId },
      select: appointmentCustomerHistorySelect,
      orderBy: {
        date: "desc",
      },
    }),
  ]);

  const normalizedSearch = search.trim();
  const allClients = buildClientsFromHistory(clientNotes, allBarberAppointments);
  const clients = normalizedSearch
    ? allClients.filter((client) =>
        [client.name, client.email || "", client.phone || ""].some((value) =>
          matchesSearch(value, normalizedSearch)
        )
      )
    : allClients;

  return {
    search: normalizedSearch,
    clients,
  };
}

export async function getBarberClientProfile(barberId: string, customerId: string) {
  const customer = await prisma.user.findFirst({
    where: {
      id: customerId,
      customerAppointments: {
        some: {
          barberId,
        },
      },
    },
    include: {
      customerProfile: {
        include: {
          preferredBarber: true,
        },
      },
      customerAppointments: {
        where: {
          barberId,
        },
        select: appointmentForTotalsSelect,
        orderBy: {
          date: "desc",
        },
      },
      customerClientNotes: {
        where: {
          barberId,
        },
      },
    },
  });

  if (!customer) {
    return null;
  }

  const totalAppointments = customer.customerAppointments.length;
  const completedAppointments = customer.customerAppointments.filter(
    (appointment) => normalizeAppointmentStatus(appointment.status) === "COMPLETED"
  ).length;
  const totalSpent = customer.customerAppointments.reduce(
    (sum, appointment) => sum + getAppointmentGrandTotal(appointment.services, appointment.items),
    0
  );
  const favoriteServiceMap = new Map<string, number>();

  for (const appointment of customer.customerAppointments) {
    favoriteServiceMap.set(
      getAppointmentDisplayName(appointment.services),
      (favoriteServiceMap.get(getAppointmentDisplayName(appointment.services)) || 0) + 1
    );
  }

  const favoriteService = Array.from(favoriteServiceMap.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || null;

  return {
    customer: {
      id: customer.id,
      name: customer.name || "Cliente",
      email: customer.email || null,
      phone: customer.phone || null,
      createdAt: customer.createdAt,
      note: customer.customerClientNotes[0]?.note || "",
      birthDate: customer.customerProfile?.birthDate || null,
      allergies: customer.customerProfile?.allergies || "",
      preferences: customer.customerProfile?.preferences || "",
      preferredBarberName: customer.customerProfile?.preferredBarber?.name || null,
    },
    stats: {
      totalAppointments,
      completedAppointments,
      totalSpent,
      favoriteService,
      lastAppointment: customer.customerAppointments[0]?.date || null,
    },
    appointments: customer.customerAppointments.map((appointment) => ({
      ...appointment,
      status: normalizeAppointmentStatus(appointment.status),
    })),
  };
}
