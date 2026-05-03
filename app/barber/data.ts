import { prisma } from "@/lib/prisma";
import { getAppointmentItemsLabel } from "@/lib/appointmentItems";
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
  createScheduleDayStart,
  getCurrentScheduleDate,
  getCurrentScheduleDateValue,
  getScheduleDateValue,
  getScheduleDayRange,
} from "@/lib/scheduleTime";

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
    include: {
      customer: true,
      items: true,
      services: true,
    },
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
        include: {
          customer: true,
          items: true,
          services: true,
        },
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
        include: {
          customer: true,
          items: true,
          services: true,
        },
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
      }),
      prisma.appointment.findMany({
        where: { barberId },
        include: {
          customer: true,
        },
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

  for (const appointment of allBarberAppointments) {
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
        (sum, appointment) => sum + getAppointmentGrandTotal(appointment.services, appointment.items),
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
        extrasLabel: getAppointmentItemsLabel(appointment.items),
        itemsDelivered: appointment.items.length > 0 && appointment.items.every((item) => item.isDelivered),
        totalPrice: getAppointmentGrandTotal(appointment.services, appointment.items),
        serviceRevenue: getAppointmentServiceRevenue(appointment.services),
        occupiedDuration: getAppointmentServicesOccupiedDuration(appointment.services),
      })),
      nextAppointments: upcomingAppointments.map((appointment) => ({
        id: appointment.id,
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
        extrasLabel: getAppointmentItemsLabel(appointment.items),
        itemsDelivered: appointment.items.length > 0 && appointment.items.every((item) => item.isDelivered),
        totalPrice: getAppointmentGrandTotal(appointment.services, appointment.items),
        serviceRevenue: getAppointmentServiceRevenue(appointment.services),
        occupiedDuration: getAppointmentServicesOccupiedDuration(appointment.services),
      })),
    },
    appointments: appointments.map((appointment) => ({
      ...appointment,
      status: normalizeAppointmentStatus(appointment.status),
    })),
    services,
    walkInServices,
    availabilities,
    blocks,
    recurringBlocks,
    clients: Array.from(clientsMap.values()),
  };
}

export async function getBarberClientsDirectory(barberId: string, search = "") {
  const dashboard = await getBarberDashboardData(barberId, {
    view: "all",
    status: "ALL",
  });

  const normalizedSearch = search.trim();
  const clients = normalizedSearch
    ? dashboard.clients.filter((client) =>
        [client.name, client.email || "", client.phone || ""].some((value) =>
          matchesSearch(value, normalizedSearch)
        )
      )
    : dashboard.clients;

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
        include: {
          items: true,
          services: true,
        },
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
