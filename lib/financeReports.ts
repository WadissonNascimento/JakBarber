import { prisma } from "@/lib/prisma";
import { getMonthRange, getWeekRange } from "@/lib/financials";
import { normalizeAppointmentStatus } from "@/lib/appointmentStatus";
import {
  getAppointmentGrandTotal,
  getAppointmentTotalBarberPayout,
  getAppointmentTotalShopRevenue,
} from "@/lib/appointmentServices";
import {
  appointmentForFinanceSelect,
  appointmentForTotalsSelect,
} from "@/lib/appointmentSelects";
import { toMoneyNumber } from "@/lib/money";

export type FinancePeriod = "week" | "month" | "custom";

export type FinanceFilters = {
  period?: FinancePeriod;
  start?: string;
  end?: string;
  historyStart?: string;
  historyEnd?: string;
  compareMode?: "auto" | "custom";
  compareStart?: string;
  compareEnd?: string;
};

export function resolveFinanceRange(filters: FinanceFilters) {
  if (filters.period === "custom" && filters.start && filters.end) {
    const start = new Date(`${filters.start}T00:00:00`);
    const end = new Date(`${filters.end}T23:59:59.999`);
    return {
      period: "custom" as const,
      start,
      end,
    };
  }

  if (filters.period !== "month") {
    const { start, end } = getWeekRange();
    return {
      period: "week" as const,
      start,
      end,
    };
  }

  const { start, end } = getMonthRange();
  return {
    period: "month" as const,
    start,
    end,
  };
}

function formatDayKey(date: Date) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatWeekdayLabel(date: Date) {
  return new Date(date).toLocaleDateString("pt-BR", {
    weekday: "long",
  });
}

function getDeliveredItems<T extends { isDelivered: boolean }>(items: T[]) {
  return items.filter((item) => item.isDelivered);
}

function getPreviousRange(start: Date, end: Date) {
  const duration = end.getTime() - start.getTime() + 1;
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration + 1);

  return {
    start: previousStart,
    end: previousEnd,
  };
}

export async function getFinanceDashboardData(filters: FinanceFilters) {
  const range = resolveFinanceRange(filters);
  const autoPreviousRange = getPreviousRange(range.start, range.end);
  const compareMode = filters.compareMode === "custom" ? "custom" : "auto";
  const comparisonRange =
    compareMode === "custom" && filters.compareStart && filters.compareEnd
      ? {
          start: new Date(`${filters.compareStart}T00:00:00`),
          end: new Date(`${filters.compareEnd}T23:59:59.999`),
        }
      : autoPreviousRange;
  const historyStart = filters.historyStart
    ? new Date(`${filters.historyStart}T00:00:00`)
    : null;
  const historyEnd = filters.historyEnd
    ? new Date(`${filters.historyEnd}T23:59:59.999`)
    : null;

  const [appointments, previousAppointments, savedPayouts, paidHistory] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        date: {
          gte: range.start,
          lte: range.end,
        },
      },
      select: appointmentForFinanceSelect,
      orderBy: {
        date: "asc",
      },
    }),
    prisma.appointment.findMany({
      where: {
        date: {
          gte: comparisonRange.start,
          lte: comparisonRange.end,
        },
      },
      select: appointmentForTotalsSelect,
    }),
    prisma.barberPayout.findMany({
      where: {
        periodStart: range.start,
        periodEnd: range.end,
      },
      include: {
        barber: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.barberPayout.findMany({
      where: {
        ...(historyStart || historyEnd
          ? {
              periodStart: historyStart ? { gte: historyStart } : undefined,
              periodEnd: historyEnd ? { lte: historyEnd } : undefined,
            }
          : undefined),
      },
      include: {
        barber: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 12,
    }),
  ]);

  const completedAppointments = appointments.filter(
    (appointment) => normalizeAppointmentStatus(appointment.status) === "COMPLETED"
  );
  const previousCompletedAppointments = previousAppointments.filter(
    (appointment) => normalizeAppointmentStatus(appointment.status) === "COMPLETED"
  );

  const barberMap = new Map<
    string,
    {
      barberId: string;
      barberName: string;
      grossRevenue: number;
      commissionTotal: number;
      shopNetRevenue: number;
      appointmentsCount: number;
      savedPayoutId: string | null;
      savedStatus: string | null;
      savedPaidAt: Date | null;
    }
  >();

  for (const appointment of completedAppointments) {
    const current = barberMap.get(appointment.barberId) || {
      barberId: appointment.barberId,
      barberName: appointment.barber.name || "Barbeiro",
      grossRevenue: 0,
      commissionTotal: 0,
      shopNetRevenue: 0,
      appointmentsCount: 0,
      savedPayoutId: null,
      savedStatus: null,
      savedPaidAt: null,
    };

    current.grossRevenue += getAppointmentGrandTotal(
      appointment.services,
      getDeliveredItems(appointment.items)
    );
    current.commissionTotal += getAppointmentTotalBarberPayout(
      appointment.services,
      appointment.items
    );
    current.shopNetRevenue += getAppointmentTotalShopRevenue(
      appointment.services,
      appointment.items
    );
    current.appointmentsCount += 1;

    barberMap.set(appointment.barberId, current);
  }

  for (const payout of savedPayouts) {
    const current = barberMap.get(payout.barberId) || {
      barberId: payout.barberId,
      barberName: payout.barber.name || "Barbeiro",
      grossRevenue: toMoneyNumber(payout.grossRevenue),
      commissionTotal: toMoneyNumber(payout.commissionTotal),
      shopNetRevenue: toMoneyNumber(payout.shopNetRevenue),
      appointmentsCount: 0,
      savedPayoutId: payout.id,
      savedStatus: payout.status,
      savedPaidAt: payout.paidAt,
    };

    current.savedPayoutId = payout.id;
    current.savedStatus = payout.status;
    current.savedPaidAt = payout.paidAt;

    barberMap.set(payout.barberId, current);
  }

  const barberPayouts = Array.from(barberMap.values()).sort(
    (a, b) => b.grossRevenue - a.grossRevenue
  );
  const totalGrossRevenue = barberPayouts.reduce((sum, item) => sum + item.grossRevenue, 0);
  const totalCommission = barberPayouts.reduce(
    (sum, item) => sum + item.commissionTotal,
    0
  );
  const totalNetRevenue = barberPayouts.reduce(
    (sum, item) => sum + item.shopNetRevenue,
    0
  );
  const totalAppointments = barberPayouts.reduce(
    (sum, item) => sum + item.appointmentsCount,
    0
  );
  const averageTicket =
    totalAppointments > 0 ? Number((totalGrossRevenue / totalAppointments).toFixed(2)) : 0;
  const previousGrossRevenue = previousCompletedAppointments.reduce(
    (sum, appointment) =>
      sum +
      getAppointmentGrandTotal(
        appointment.services,
        getDeliveredItems(appointment.items)
      ),
    0
  );
  const previousCommissionTotal = previousCompletedAppointments.reduce(
    (sum, appointment) =>
      sum +
      getAppointmentTotalBarberPayout(appointment.services, appointment.items),
    0
  );
  const previousShopNetRevenue = previousCompletedAppointments.reduce(
    (sum, appointment) =>
      sum +
      getAppointmentTotalShopRevenue(appointment.services, appointment.items),
    0
  );
  const previousAppointmentsCount = previousCompletedAppointments.length;

  const dailyMap = new Map<
    string,
    {
      date: string;
      label: string;
      grossRevenue: number;
      commissionTotal: number;
      shopNetRevenue: number;
      appointmentsCount: number;
    }
  >();
  const weekdayMap = new Map<
    string,
    {
      label: string;
      grossRevenue: number;
      appointmentsCount: number;
    }
  >();
  const servicesMap = new Map<
    string,
    {
      label: string;
      grossRevenue: number;
      count: number;
    }
  >();
  const barbersAnalyticsMap = new Map<
    string,
    {
      barberId: string;
      barberName: string;
      grossRevenue: number;
      commissionTotal: number;
      shopNetRevenue: number;
      appointmentsCount: number;
      bestDay: {
        date: string;
        label: string;
        grossRevenue: number;
        appointmentsCount: number;
      } | null;
      days: Map<
        string,
        {
          date: string;
          label: string;
          grossRevenue: number;
          appointmentsCount: number;
        }
      >;
    }
  >();

  for (const appointment of completedAppointments) {
    const dateKey = formatDayKey(appointment.date);
    const dayLabel = new Date(appointment.date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    const grossRevenue = getAppointmentGrandTotal(
      appointment.services,
      getDeliveredItems(appointment.items)
    );
    const commissionTotal = getAppointmentTotalBarberPayout(
      appointment.services,
      appointment.items
    );
    const shopNetRevenue = getAppointmentTotalShopRevenue(
      appointment.services,
      appointment.items
    );

    const dayCurrent = dailyMap.get(dateKey) || {
      date: dateKey,
      label: dayLabel,
      grossRevenue: 0,
      commissionTotal: 0,
      shopNetRevenue: 0,
      appointmentsCount: 0,
    };
    dayCurrent.grossRevenue += grossRevenue;
    dayCurrent.commissionTotal += commissionTotal;
    dayCurrent.shopNetRevenue += shopNetRevenue;
    dayCurrent.appointmentsCount += 1;
    dailyMap.set(dateKey, dayCurrent);

    const weekdayLabel = formatWeekdayLabel(appointment.date);
    const weekdayCurrent = weekdayMap.get(weekdayLabel) || {
      label: weekdayLabel,
      grossRevenue: 0,
      appointmentsCount: 0,
    };
    weekdayCurrent.grossRevenue += grossRevenue;
    weekdayCurrent.appointmentsCount += 1;
    weekdayMap.set(weekdayLabel, weekdayCurrent);

    for (const service of appointment.services) {
      const serviceCurrent = servicesMap.get(service.nameSnapshot) || {
        label: service.nameSnapshot,
        grossRevenue: 0,
        count: 0,
      };
      serviceCurrent.grossRevenue += toMoneyNumber(service.priceSnapshot);
      serviceCurrent.count += 1;
      servicesMap.set(service.nameSnapshot, serviceCurrent);
    }

    const barberCurrent = barbersAnalyticsMap.get(appointment.barberId) || {
      barberId: appointment.barberId,
      barberName: appointment.barber.name || "Barbeiro",
      grossRevenue: 0,
      commissionTotal: 0,
      shopNetRevenue: 0,
      appointmentsCount: 0,
      bestDay: null,
      days: new Map(),
    };
    barberCurrent.grossRevenue += grossRevenue;
    barberCurrent.commissionTotal += commissionTotal;
    barberCurrent.shopNetRevenue += shopNetRevenue;
    barberCurrent.appointmentsCount += 1;

    const barberDayCurrent = barberCurrent.days.get(dateKey) || {
      date: dateKey,
      label: dayLabel,
      grossRevenue: 0,
      appointmentsCount: 0,
    };
    barberDayCurrent.grossRevenue += grossRevenue;
    barberDayCurrent.appointmentsCount += 1;
    barberCurrent.days.set(dateKey, barberDayCurrent);
    barbersAnalyticsMap.set(appointment.barberId, barberCurrent);
  }

  const dailySeries = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const topDay =
    dailySeries.slice().sort((a, b) => b.grossRevenue - a.grossRevenue)[0] || null;
  const busiestDay =
    dailySeries.slice().sort((a, b) => b.appointmentsCount - a.appointmentsCount)[0] ||
    null;
  const weekdayPerformance = Array.from(weekdayMap.values()).sort(
    (a, b) => b.grossRevenue - a.grossRevenue
  );
  const topServices = Array.from(servicesMap.values()).sort(
    (a, b) => b.grossRevenue - a.grossRevenue
  );
  const barberInsights = Array.from(barbersAnalyticsMap.values())
    .map((item) => {
      const bestDay =
        Array.from(item.days.values()).sort((a, b) => b.grossRevenue - a.grossRevenue)[0] ||
        null;

      return {
        barberId: item.barberId,
        barberName: item.barberName,
        grossRevenue: item.grossRevenue,
        commissionTotal: item.commissionTotal,
        shopNetRevenue: item.shopNetRevenue,
        appointmentsCount: item.appointmentsCount,
        revenueShare:
          totalGrossRevenue > 0
            ? Number(((item.grossRevenue / totalGrossRevenue) * 100).toFixed(1))
            : 0,
        payoutShare:
          totalCommission > 0
            ? Number(((item.commissionTotal / totalCommission) * 100).toFixed(1))
            : 0,
        bestDay,
      };
    })
    .sort((a, b) => b.grossRevenue - a.grossRevenue);

  return {
    filters: {
      period: range.period,
      start: range.start.toISOString().slice(0, 10),
      end: range.end.toISOString().slice(0, 10),
      historyStart: filters.historyStart || "",
      historyEnd: filters.historyEnd || "",
      compareMode,
      compareStart: comparisonRange.start.toISOString().slice(0, 10),
      compareEnd: comparisonRange.end.toISOString().slice(0, 10),
    },
    summary: {
      grossRevenue: totalGrossRevenue,
      commissionTotal: totalCommission,
      shopNetRevenue: totalNetRevenue,
      barbersCount: barberPayouts.length,
      appointmentsCount: totalAppointments,
      averageTicket,
      payoutRate:
        totalGrossRevenue > 0
          ? Number(((totalCommission / totalGrossRevenue) * 100).toFixed(1))
          : 0,
      netRate:
        totalGrossRevenue > 0
          ? Number(((totalNetRevenue / totalGrossRevenue) * 100).toFixed(1))
          : 0,
    },
    comparison: {
      current: {
        grossRevenue: totalGrossRevenue,
        commissionTotal: totalCommission,
        shopNetRevenue: totalNetRevenue,
        appointmentsCount: totalAppointments,
      },
      previous: {
        grossRevenue: previousGrossRevenue,
        commissionTotal: previousCommissionTotal,
        shopNetRevenue: previousShopNetRevenue,
        appointmentsCount: previousAppointmentsCount,
      },
      previousRange: {
        start: comparisonRange.start.toISOString().slice(0, 10),
        end: comparisonRange.end.toISOString().slice(0, 10),
      },
    },
    analytics: {
      topDay,
      busiestDay,
      weekdayPerformance,
      topServices,
      dailySeries,
      barberInsights,
    },
    barberPayouts,
    history: paidHistory.map((payout) => ({
      ...payout,
      grossRevenue: toMoneyNumber(payout.grossRevenue),
      commissionTotal: toMoneyNumber(payout.commissionTotal),
      shopNetRevenue: toMoneyNumber(payout.shopNetRevenue),
    })),
  };
}

export async function getBarberPayoutSnapshot(input: {
  barberId: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  const appointments = await prisma.appointment.findMany({
    where: {
      barberId: input.barberId,
      date: {
        gte: input.periodStart,
        lte: input.periodEnd,
      },
    },
    select: appointmentForTotalsSelect,
  });

  const completedAppointments = appointments.filter(
    (appointment) => normalizeAppointmentStatus(appointment.status) === "COMPLETED"
  );

  return {
    grossRevenue: completedAppointments.reduce(
      (sum, appointment) =>
        sum +
        getAppointmentGrandTotal(
          appointment.services,
          getDeliveredItems(appointment.items)
        ),
      0
    ),
    commissionTotal: completedAppointments.reduce(
      (sum, appointment) =>
        sum + getAppointmentTotalBarberPayout(appointment.services, appointment.items),
      0
    ),
    shopNetRevenue: completedAppointments.reduce(
      (sum, appointment) =>
        sum + getAppointmentTotalShopRevenue(appointment.services, appointment.items),
      0
    ),
  };
}
