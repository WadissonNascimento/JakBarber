import { prisma } from "@/lib/prisma";
import { toMoneyNumber } from "@/lib/money";

type AdvanceRange = {
  start: Date;
  end: Date;
};

export type BarberAdvanceFinanceSummary = {
  barberId: string;
  advancesTotal: number;
  advancesCount: number;
};

export async function getBarberAdvancesTotal({
  barberId,
  range,
}: {
  barberId: string;
  range: AdvanceRange;
}) {
  const result = await prisma.barberAdvance.aggregate({
    where: {
      barberId,
      advanceDate: {
        gte: range.start,
        lte: range.end,
      },
    },
    _sum: {
      amount: true,
    },
    _count: {
      _all: true,
    },
  });

  return {
    advancesTotal: toMoneyNumber(result._sum.amount),
    advancesCount: result._count._all,
  };
}

export async function getBarberAdvancesByBarber(
  range: AdvanceRange,
  shopId?: string | null
) {
  const groupedAdvances = await prisma.barberAdvance.groupBy({
    by: ["barberId"],
    where: {
      ...(shopId ? { shopId } : {}),
      advanceDate: {
        gte: range.start,
        lte: range.end,
      },
    },
    _sum: {
      amount: true,
    },
    _count: {
      _all: true,
    },
  });

  return new Map<string, BarberAdvanceFinanceSummary>(
    groupedAdvances.map((item) => [
      item.barberId,
      {
        barberId: item.barberId,
        advancesTotal: toMoneyNumber(item._sum.amount),
        advancesCount: item._count._all,
      },
    ])
  );
}

export async function getBarberAdvanceRows({
  barberId,
  range,
}: {
  barberId: string;
  range: AdvanceRange;
}) {
  const rows = await prisma.barberAdvance.findMany({
    where: {
      barberId,
      advanceDate: {
        gte: range.start,
        lte: range.end,
      },
    },
    select: {
      id: true,
      amount: true,
      reason: true,
      advanceDate: true,
      createdAt: true,
    },
    orderBy: {
      advanceDate: "desc",
    },
  });

  return rows.map((row) => ({
    ...row,
    amount: toMoneyNumber(row.amount),
  }));
}
