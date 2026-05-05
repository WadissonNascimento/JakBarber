import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ReceiptText,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { normalizeAppointmentStatus } from "@/lib/appointmentStatus";
import {
  getAppointmentDisplayName,
  getAppointmentGrandTotal,
  getAppointmentTotalBarberPayout,
} from "@/lib/appointmentServices";
import { prisma } from "@/lib/prisma";
import { getCurrentScheduleDateValue, getScheduleDayRange } from "@/lib/scheduleTime";
import { formatCurrency } from "@/lib/utils";
import { requireActiveBarber } from "../guard";
import BarberFinanceFilters from "./BarberFinanceFilters";
import FinanceAppointmentCard from "./FinanceAppointmentCard";

type SearchParams = {
  start?: string;
  end?: string;
};

export default async function BarberFinancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { barber } = await requireActiveBarber();
  const data = await getBarberFinanceData(barber.id, searchParams);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <Link
        href="/barber"
        className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)] hover:text-white"
      >
        <ArrowLeft className="h-4 w-4 text-[var(--brand-strong)]" />
        Voltar para o painel
      </Link>

      <PageHeader
        eyebrow="Meu financeiro"
        title={`Financeiro de ${barber.name || "Barbeiro"}`}
        description="Consulte seus repasses por período e veja quanto cada atendimento gerou para você."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.25)] backdrop-blur sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--brand)]/25 bg-[var(--brand-muted)] text-[var(--brand-strong)]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
                Consulta
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">Filtrar período</h2>
              <p className="mt-1 text-sm leading-5 text-zinc-400">
                Escolha o período para consultar somente repasses já confirmados.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <BarberFinanceFilters
              start={data.filters.start}
              end={data.filters.end}
            />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <FinanceMetricCard
            icon={<Wallet />}
            label="Repasse confirmado"
            value={formatCurrency(data.summary.completedPayout)}
            helper={`${data.summary.completedCount} atendimento(s) concluído(s)`}
            tone="emerald"
          />
          <FinanceMetricCard
            icon={<ShoppingBag />}
            label="Retiradas entregues"
            value={formatCurrency(data.summary.deliveredItemsPayout)}
            helper="Itens que entraram no repasse"
            tone="amber"
          />
          <FinanceMetricCard
            icon={<ReceiptText />}
            label="Total vendido"
            value={formatCurrency(data.summary.completedGross)}
            helper="Atendimentos concluídos"
            tone="neutral"
          />
        </section>
      </div>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
              Atendimentos
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              Atendimentos
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Atendimentos de hoje com serviços, retiradas entregues e repasse.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold text-zinc-300">
            {data.todayAppointments.length}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {data.todayAppointments.length === 0 ? (
            <EmptyState
              title="Nenhum repasse para hoje"
              description="Quando houver atendimento hoje, o detalhamento aparece aqui."
            />
          ) : (
            data.todayAppointments.map((appointment) => (
              <FinanceAppointmentCard
                key={appointment.id}
                appointment={appointment}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

async function getBarberFinanceData(barberId: string, searchParams: SearchParams) {
  const range = resolveFinanceRange(searchParams);
  const todayRange =
    getScheduleDayRange(getCurrentScheduleDateValue()) || {
      start: new Date(),
      end: new Date(),
    };
  const appointments = await prisma.appointment.findMany({
    where: {
      barberId,
      date: {
        gte: range.startDate,
        lte: range.endDate,
      },
      status: { in: ["COMPLETED", "DONE"] },
    },
    include: {
      customer: true,
      services: true,
      items: true,
    },
    orderBy: {
      date: "desc",
    },
    take: 120,
  });

  const normalizedAppointments = appointments.map((appointment) => {
    const normalizedStatus = normalizeAppointmentStatus(appointment.status);
    const deliveredItems = appointment.items.filter((item) => item.isDelivered);
    const servicePayout = appointment.services.reduce(
      (sum, service) => sum + service.barberPayoutSnapshot,
      0
    );
    const deliveredItemsPayout = deliveredItems.reduce(
      (sum, item) => sum + item.barberPayoutSnapshot,
      0
    );
    const payoutTotal = getAppointmentTotalBarberPayout(
      appointment.services,
      appointment.items
    );
    const grossTotal = getAppointmentGrandTotal(appointment.services, deliveredItems);

    return {
      id: appointment.id,
      publicId: appointment.publicId,
      date: appointment.date,
      status: normalizedStatus,
      customerName: appointment.customer.name || "Cliente",
      serviceName: getAppointmentDisplayName(appointment.services),
      services: appointment.services
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((service) => ({
          id: service.id,
          name: service.nameSnapshot,
          price: service.priceSnapshot,
          payout: service.barberPayoutSnapshot,
        })),
      items: appointment.items.map((item) => ({
        id: item.id,
        name: item.productNameSnapshot,
        quantity: item.quantity,
        subtotal: item.subtotal,
        payout: item.barberPayoutSnapshot,
        isDelivered: item.isDelivered,
      })),
      servicePayout,
      deliveredItemsPayout,
      payoutTotal,
      grossTotal,
    };
  });

  const completedAppointments = normalizedAppointments.filter(
    (appointment) => appointment.status === "COMPLETED"
  );
  return {
    filters: {
      start: range.start,
      end: range.end,
    },
    summary: {
      completedPayout: completedAppointments.reduce(
        (sum, appointment) => sum + appointment.payoutTotal,
        0
      ),
      deliveredItemsPayout: completedAppointments.reduce(
        (sum, appointment) => sum + appointment.deliveredItemsPayout,
        0
      ),
      completedGross: completedAppointments.reduce(
        (sum, appointment) => sum + appointment.grossTotal,
        0
      ),
      completedCount: completedAppointments.length,
    },
    appointments: normalizedAppointments,
    todayAppointments: normalizedAppointments.filter(
      (appointment) =>
        appointment.date >= todayRange.start && appointment.date <= todayRange.end
    ),
  };
}

function FinanceMetricCard({
  icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  tone: "emerald" | "sky" | "amber" | "neutral";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
      : tone === "sky"
      ? "border-[var(--brand)]/25 bg-[var(--brand-muted)] text-[var(--brand-strong)]"
      : tone === "amber"
      ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
      : "border-white/10 bg-black/20 text-zinc-200";

  return (
    <div className="min-w-0 rounded-[20px] border border-white/10 bg-white/[0.035] p-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${toneClass}`}>
          <span className="[&>svg]:h-4.5 [&>svg]:w-4.5">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>
          <p className="mt-1 break-words text-xl font-black text-white">{value}</p>
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-xs leading-5 text-zinc-400">{helper}</p>
    </div>
  );
}

function resolveFinanceRange(searchParams: SearchParams) {
  const currentWeek = getCurrentWeekRange();
  const start = parseDateValue(searchParams.start) || toDateValue(currentWeek.start);
  const end = parseDateValue(searchParams.end) || toDateValue(currentWeek.end);

  return {
    start,
    end,
    startDate: new Date(`${start}T00:00:00`),
    endDate: new Date(`${end}T23:59:59.999`),
  };
}

function getCurrentWeekRange() {
  const start = new Date();
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function parseDateValue(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return value;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
