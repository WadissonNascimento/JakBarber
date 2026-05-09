import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BackLink from "@/components/ui/BackLink";
import DashboardShell from "@/components/ui/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { toMoneyNumber } from "@/lib/money";
import AdminCouponsClient from "./AdminCouponsClient";

export default async function AdminCouponsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/painel");
  }

  const coupons = await prisma.coupon.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <DashboardShell size="wide">
      <PageHeader
        title="Cupons"
        description="Crie descontos promocionais para a loja e acompanhe o uso de cada código."
        actions={<BackLink href="/admin" area="Admin" />}
      />

      <AdminCouponsClient
        coupons={coupons.map((coupon) => ({
          ...coupon,
          discountValue: toMoneyNumber(coupon.discountValue),
          minOrderTotal: toMoneyNumber(coupon.minOrderTotal),
          maxDiscount: coupon.maxDiscount === null ? null : toMoneyNumber(coupon.maxDiscount),
        }))}
      />
    </DashboardShell>
  );
}
