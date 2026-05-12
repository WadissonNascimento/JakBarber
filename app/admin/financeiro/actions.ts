"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  mutationError,
  mutationSuccess,
  type MutationResult,
} from "@/lib/mutationResult";
import { prisma } from "@/lib/prisma";
import {
  getBarberPayoutSnapshot,
  getFinanceDashboardData,
  resolveFinanceRange,
} from "@/lib/financeReports";

async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Nao autorizado.");
  }

  return session.user;
}

export async function generateBarberPayoutsAction(
  formData: FormData
): Promise<MutationResult> {
  const admin = await requireAdmin();

  const range = resolveFinanceRange({
    period: String(formData.get("period") || "week") as "week" | "month" | "custom",
    start: String(formData.get("start") || ""),
    end: String(formData.get("end") || ""),
  });

  const dashboard = await getFinanceDashboardData({
    period: range.period,
    start: range.start.toISOString().slice(0, 10),
    end: range.end.toISOString().slice(0, 10),
    compareMode: String(formData.get("compareMode") || "auto") as "auto" | "custom",
    compareStart: String(formData.get("compareStart") || ""),
    compareEnd: String(formData.get("compareEnd") || ""),
  });

  const writablePayouts = dashboard.barberPayouts.filter(
    (item) => item.savedStatus !== "CLOSED" && item.savedStatus !== "PAID"
  );

  await prisma.$transaction(
    writablePayouts.map((item) =>
      prisma.barberPayout.upsert({
        where: {
          barberId_periodStart_periodEnd: {
            barberId: item.barberId,
            periodStart: range.start,
            periodEnd: range.end,
          },
        },
        update: {
          grossRevenue: item.grossRevenue,
          commissionTotal: item.commissionTotal,
          shopNetRevenue: item.shopNetRevenue,
          status: item.savedStatus === "PAID" ? "PAID" : "CLOSED",
        },
        create: {
          shopId: admin.shopId || undefined,
          barberId: item.barberId,
          periodStart: range.start,
          periodEnd: range.end,
          grossRevenue: item.grossRevenue,
          commissionTotal: item.commissionTotal,
          shopNetRevenue: item.shopNetRevenue,
          status: "CLOSED",
        },
      })
    )
  );

  revalidatePath("/admin");
  revalidatePath("/admin/financeiro");
  return mutationSuccess("Repasses salvos com sucesso.");
}

export async function markBarberPayoutAsPaidAction(
  formData: FormData
): Promise<MutationResult> {
  await requireAdmin();

  const payoutId = String(formData.get("payoutId") || "");

  if (!payoutId) {
    return mutationError("Repasse invalido.");
  }

  await prisma.barberPayout.update({
    where: { id: payoutId },
    data: {
      status: "PAID",
      paidAt: new Date(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/financeiro");
  return mutationSuccess("Repasse marcado como pago.");
}

export async function reopenBarberPayoutAction(
  formData: FormData
): Promise<MutationResult> {
  await requireAdmin();

  const payoutId = String(formData.get("payoutId") || "");

  if (!payoutId) {
    return mutationError("Repasse invalido.");
  }

  await prisma.barberPayout.update({
    where: { id: payoutId },
    data: {
      status: "OPEN",
      paidAt: null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/financeiro");
  return mutationSuccess("Repasse aberto para revisao.", undefined, "info");
}

export async function closeBarberPayoutAction(
  formData: FormData
): Promise<MutationResult> {
  await requireAdmin();

  const payoutId = String(formData.get("payoutId") || "");

  if (!payoutId) {
    return mutationError("Repasse invalido.");
  }

  const payout = await prisma.barberPayout.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    return mutationError("Repasse nao encontrado.");
  }

  if (payout.status !== "OPEN") {
    return mutationError("Reabra o repasse antes de recalcular valores.");
  }

  const snapshot = await getBarberPayoutSnapshot({
    barberId: payout.barberId,
    periodStart: payout.periodStart,
    periodEnd: payout.periodEnd,
  });

  await prisma.barberPayout.update({
    where: { id: payoutId },
    data: {
      grossRevenue: snapshot.grossRevenue,
      commissionTotal: snapshot.commissionTotal,
      shopNetRevenue: snapshot.shopNetRevenue,
      status: "CLOSED",
      paidAt: null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/financeiro");
  return mutationSuccess("Valores conferidos e repasse fechado.");
}

export async function deleteBarberPayoutAction(
  formData: FormData
): Promise<MutationResult> {
  await requireAdmin();

  const payoutId = String(formData.get("payoutId") || "");

  if (!payoutId) {
    return mutationError("Repasse invalido.");
  }

  const payout = await prisma.barberPayout.findUnique({
    where: { id: payoutId },
    select: { id: true },
  });

  if (!payout) {
    return mutationError("Repasse nao encontrado.");
  }

  await prisma.barberPayout.delete({
    where: { id: payoutId },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/financeiro");
  return mutationSuccess("Repasse excluido com sucesso.");
}
