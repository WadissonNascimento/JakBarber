import { redirect } from "next/navigation";
import { auth } from "@/auth";
import BackLink from "@/components/ui/BackLink";
import DashboardShell from "@/components/ui/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import { normalizeAppointmentStatus } from "@/lib/appointmentStatus";
import { toMoneyNumber, type MoneyValue } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

function formatCommission(type: string, value: MoneyValue) {
  const numericValue = toMoneyNumber(value);
  return type === "FIXED" ? formatCurrency(numericValue) : `${numericValue}%`;
}

export default async function PayoutReport({
  barberId,
  title,
  description,
  range,
}: {
  barberId: string;
  title: string;
  description: string;
  range: {
    start: Date;
    end: Date;
  };
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/painel");

  const barber = await prisma.user.findFirst({
    where: {
      id: barberId,
      role: "BARBER",
    },
  });

  if (!barber) redirect("/admin/barbeiros");

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId: barber.id,
      date: {
        gte: range.start,
        lte: range.end,
      },
      status: {
        in: ["COMPLETED", "DONE"],
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
  });

  const serviceRows = appointments.flatMap((appointment) =>
    [...appointment.services]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((service) => ({
        id: service.id,
        appointmentId: appointment.id,
        time: appointment.date.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        customerName: appointment.customer.name || "Cliente",
        name: service.nameSnapshot,
        gross: toMoneyNumber(service.priceSnapshot),
        commission: formatCommission(
          service.commissionTypeSnapshot,
          service.commissionValueSnapshot
        ),
        payout: toMoneyNumber(service.barberPayoutSnapshot),
        type: "Serviço",
      }))
  );

  const productRows = appointments.flatMap((appointment) =>
    appointment.items
      .filter((item) => item.isDelivered)
      .map((item) => ({
        id: item.id,
        appointmentId: appointment.id,
        time: appointment.date.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        customerName: appointment.customer.name || "Cliente",
        name: `${item.productNameSnapshot} x${item.quantity}`,
        gross: toMoneyNumber(item.subtotal),
        commission: formatCommission(item.commissionTypeSnapshot, item.commissionValueSnapshot),
        payout: toMoneyNumber(item.barberPayoutSnapshot),
        type: "Produto",
      }))
  );

  const rows = [...serviceRows, ...productRows];
  const totalGross = rows.reduce((sum, row) => sum + row.gross, 0);
  const totalPayout = rows.reduce((sum, row) => sum + row.payout, 0);

  return (
    <DashboardShell>
      <PageHeader
        eyebrow={barber.name || "Barbeiro"}
        title={title}
        description={description}
        actions={
          <BackLink href={`/admin/barbeiros/${barber.id}`} area="Perfil" />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard label="Total vendido" value={formatCurrency(totalGross)} />
        <SummaryCard label="Repasse do barbeiro" value={formatCurrency(totalPayout)} />
      </div>

      <div className="mt-5 space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-400">
            Nenhum atendimento concluído nesse período.
          </div>
        ) : (
          rows.map((row) => (
            <article
              key={`${row.type}-${row.id}`}
              className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,40,61,0.72),rgba(13,18,30,0.98))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.18)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">
                    {row.type} - {row.time}
                  </p>
                  <p className="mt-2 font-semibold text-white">{row.name}</p>
                  <p className="mt-1 truncate text-sm text-zinc-400">{row.customerName}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300">
                  {row.commission}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <InfoBox label="Valor" value={formatCurrency(row.gross)} />
                <InfoBox label="Ganho barbeiro" value={formatCurrency(row.payout)} />
              </div>
            </article>
          ))
        )}
      </div>
    </DashboardShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,40,61,0.72),rgba(13,18,30,0.98))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.18)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">{label}</p>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
