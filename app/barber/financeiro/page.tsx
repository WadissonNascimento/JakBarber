import {
  CalendarDays,
  Wallet,
} from "lucide-react";
import BackLink from "@/components/ui/BackLink";
import EmptyState from "@/components/ui/EmptyState";
import ExclusiveDetails from "@/components/ui/ExclusiveDetails";
import PageHeader from "@/components/ui/PageHeader";
import { normalizeAppointmentStatus } from "@/lib/appointmentStatus";
import {
  getAppointmentDisplayName,
  getAppointmentGrandTotal,
  getAppointmentTotalBarberPayout,
} from "@/lib/appointmentServices";
import { appointmentForBarberSelect } from "@/lib/appointmentSelects";
import {
  getBarberAdvanceRows,
  getBarberAdvancesTotal,
} from "@/lib/barberAdvances";
import { getBarberTipRows, getBarberTipsTotal } from "@/lib/barberTips";
import {
  getManualFitInCustomerDisplay,
  getManualFitInVisibleNotes,
} from "@/lib/manualFitIn";
import { toMoneyNumber } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  getScheduleDayRange,
} from "@/lib/scheduleTime";
import { getFortnightRange } from "@/lib/financials";
import { formatCurrency } from "@/lib/utils";
import { requireActiveBarber } from "../guard";
import BarberFinanceFilters from "./BarberFinanceFilters";
import FinanceAppointmentCard, {
  type FinanceAppointmentCardData,
} from "./FinanceAppointmentCard";

type SearchParams = {
  start?: string | string[];
  end?: string | string[];
};

export default async function BarberFinancePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const filters = (await searchParams) || {};
  const { barber } = await requireActiveBarber();
  const data = await getBarberFinanceData(barber.id, barber.shopId, filters);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <BackLink href="/barber" area="Painel" className="mb-5" />

      <PageHeader
        eyebrow="Meu financeiro"
        title={`Financeiro de ${barber.name || "Barbeiro"}`}
        description="Consulte seus repasses por período e veja quanto cada atendimento gerou para você."
        variant="plain"
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

        <section className="grid gap-3">
          <FinanceMetricCard
            icon={<Wallet />}
            label="Repasse confirmado"
            value={formatCurrency(data.summary.completedPayout)}
            helper={`${data.summary.completedCount} atendimento(s) concluido(s)`}
            details={[
              {
                label: "Servicos",
                value: formatCurrency(data.summary.servicePayout),
              },
              {
                label: "Retiradas",
                value: formatCurrency(data.summary.deliveredItemsPayout),
              },
              {
                label: "Caixinhas",
                value: formatCurrency(data.summary.tipsTotal),
              },
              {
                label: "Vales",
                value: `- ${formatCurrency(data.summary.advancesTotal)}`,
              },
            ]}
            tone="emerald"
            featured
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
              Atendimentos do período com serviços, retiradas entregues e repasse.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold text-zinc-300">
            {data.appointments.length}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {data.dailyGroups.length === 0 ? (
            <EmptyState
              title="Nenhum repasse no período"
              description="Ajuste o filtro para consultar outros atendimentos concluídos."
            />
          ) : (
            data.dailyGroups.map((day) => (
              <ExclusiveDetails
                key={day.date}
                group="barber-finance-days"
                className="group overflow-hidden rounded-[22px] border border-white/10 bg-black/25"
              >
                <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition hover:bg-white/[0.035] [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-white">{day.label}</p>
                    <p className="mt-1 truncate text-xs text-zinc-400">
                      {day.appointments.length} atendimento(s) - Repasse:{" "}
                      {formatCurrency(day.netPayout)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">
                      {formatCurrency(day.netPayout)}
                    </p>
                    <p className="text-xs text-zinc-500 group-open:hidden">abrir</p>
                    <p className="hidden text-xs text-zinc-500 group-open:block">fechar</p>
                  </div>
                </summary>

                <div className="border-t border-white/10 px-3 pb-3 pt-3">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <DayValueTile label="Servicos" value={formatCurrency(day.servicePayout)} />
                    <DayValueTile label="Retiradas" value={formatCurrency(day.deliveredItemsPayout)} />
                    <DayValueTile label="Caixinhas" value={formatCurrency(day.tipsTotal)} />
                    <DayValueTile
                      label="Vales"
                      value={`- ${formatCurrency(day.advancesTotal)}`}
                      tone="warning"
                    />
                  </div>

                  {day.advances.length > 0 ? (
                    <div className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-400/5 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
                        Vales do dia
                      </p>
                      <div className="mt-2 space-y-2">
                        {day.advances.map((advance) => (
                          <div
                            key={advance.id}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <span className="min-w-0 text-zinc-300">
                              {advance.reason || "Vale"}
                            </span>
                            <strong className="shrink-0 text-amber-200">
                              - {formatCurrency(advance.amount)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {day.tips.length > 0 ? (
                    <div className="mt-3 rounded-2xl border border-[var(--brand)]/15 bg-[var(--brand-muted)] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                        Caixinhas do dia
                      </p>
                      <div className="mt-2 space-y-2">
                        {day.tips.map((tip) => (
                          <div
                            key={tip.id}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <span className="min-w-0 text-zinc-300">
                              {tip.clientName}
                              {tip.note ? ` - ${tip.note}` : ""}
                            </span>
                            <strong className="shrink-0 text-[var(--brand-strong)]">
                              {formatCurrency(tip.amount)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 space-y-2">
                    {day.appointments.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-white/10 p-3 text-sm text-zinc-400">
                        Nenhum atendimento concluido nesse dia.
                      </p>
                    ) : (
                      day.appointments.map((appointment) => (
                        <FinanceAppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          services={data.editServices}
                          extras={data.editExtras}
                        />
                      ))
                    )}
                  </div>
                </div>
              </ExclusiveDetails>
            ))
          )}
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
              Caixinhas
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              Caixinhas do periodo
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Valores registrados como caixinha entram 100% no seu repasse.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold text-zinc-300">
            {formatCurrency(data.summary.tipsTotal)}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {data.tips.length === 0 ? (
            <EmptyState
              title="Nenhuma caixinha no periodo"
              description="Quando houver caixinhas registradas, elas aparecem aqui e entram no repasse."
            />
          ) : (
            data.tips.map((tip) => (
              <div
                key={tip.id}
                className="rounded-2xl border border-white/10 bg-black/25 p-3"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">
                      {tip.clientName}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {tip.createdAt.toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-black text-[var(--brand-strong)]">
                    {formatCurrency(tip.amount)}
                  </p>
                </div>
                {tip.note ? (
                  <p className="mt-2 border-t border-white/10 pt-2 text-sm text-zinc-300">
                    {tip.note}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

async function getBarberFinanceData(
  barberId: string,
  shopId: string,
  searchParams: SearchParams
) {
  const range = resolveFinanceRange(searchParams);
  const [appointments, tipsSummary, advancesSummary, tips, advances] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        shopId,
        barberId,
        date: {
          gte: range.startDate,
          lte: range.endDate,
        },
        status: { in: ["COMPLETED", "DONE"] },
      },
      select: appointmentForBarberSelect,
      orderBy: {
        date: "desc",
      },
      take: 120,
    }),
    getBarberTipsTotal({
      barberId,
      range: {
        start: range.startDate,
        end: range.endDate,
      },
    }),
    getBarberAdvancesTotal({
      barberId,
      range: {
        start: range.startDate,
        end: range.endDate,
      },
    }),
    getBarberTipRows({
      barberId,
      range: {
        start: range.startDate,
        end: range.endDate,
      },
    }),
    getBarberAdvanceRows({
      barberId,
      range: {
        start: range.startDate,
        end: range.endDate,
      },
    }),
  ]);

  const currentServiceIds = Array.from(
    new Set(
      appointments.flatMap((appointment) =>
        appointment.services.map((service) => service.serviceId)
      )
    )
  );
  const currentExtraIds = Array.from(
    new Set(
      appointments.flatMap((appointment) =>
        appointment.items.map((item) => item.extraProductId)
      )
    )
  );
  const [editServices, editExtras] = await Promise.all([
    prisma.service.findMany({
      where: {
        shopId,
        AND: [
          {
            OR: [{ barberId }, { barberId: null }],
          },
          {
            OR: [
              { isActive: true },
              ...(currentServiceIds.length ? [{ id: { in: currentServiceIds } }] : []),
            ],
          },
        ],
      },
      orderBy: [
        {
          barberId: "desc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        price: true,
        duration: true,
      },
    }),
    prisma.extraProduct.findMany({
      where: {
        shopId,
        OR: [
          {
            isActive: true,
            stock: {
              gt: 0,
            },
          },
          ...(currentExtraIds.length ? [{ id: { in: currentExtraIds } }] : []),
        ],
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
      },
    }),
  ]);

  const normalizedAppointments = appointments.map((appointment) => {
    const normalizedStatus = normalizeAppointmentStatus(appointment.status);
    const deliveredItems = appointment.items.filter((item) => item.isDelivered);
    const servicePayout = appointment.services.reduce(
      (sum, service) => sum + toMoneyNumber(service.barberPayoutSnapshot),
      0
    );
    const deliveredItemsPayout = deliveredItems.reduce(
      (sum, item) => sum + toMoneyNumber(item.barberPayoutSnapshot),
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
      paymentMethod: appointment.paymentMethod,
      customerName: appointment.isManualFitIn
        ? getManualFitInCustomerDisplay({
            notes: appointment.notes,
            fallbackCustomer: appointment.customer,
          }).name
        : appointment.customer.name || "Cliente",
      barberId: appointment.barberId,
      serviceName: getAppointmentDisplayName(appointment.services),
      notes: appointment.isManualFitIn
        ? getManualFitInVisibleNotes(appointment.notes) || null
        : appointment.notes,
      services: appointment.services
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((service) => ({
          id: service.id,
          serviceId: service.serviceId,
          name: service.nameSnapshot,
          price: toMoneyNumber(service.priceSnapshot),
          payout: toMoneyNumber(service.barberPayoutSnapshot),
        })),
      items: appointment.items.map((item) => ({
        id: item.id,
        extraProductId: item.extraProductId,
        name: item.productNameSnapshot,
        quantity: item.quantity,
        subtotal: toMoneyNumber(item.subtotal),
        payout: toMoneyNumber(item.barberPayoutSnapshot),
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
  const servicePayout = completedAppointments.reduce(
    (sum, appointment) => sum + appointment.servicePayout,
    0
  );
  const appointmentsPayout = completedAppointments.reduce(
    (sum, appointment) => sum + appointment.payoutTotal,
    0
  );
  const deliveredItemsPayout = completedAppointments.reduce(
    (sum, appointment) => sum + appointment.deliveredItemsPayout,
    0
  );
  const completedGross = completedAppointments.reduce(
    (sum, appointment) => sum + appointment.grossTotal,
    0
  );

  return {
    filters: {
      start: range.start,
      end: range.end,
    },
    summary: {
      servicePayout,
      completedPayout: appointmentsPayout + tipsSummary.tipsTotal - advancesSummary.advancesTotal,
      payoutBeforeAdvances: appointmentsPayout + tipsSummary.tipsTotal,
      deliveredItemsPayout,
      completedGross: completedGross + tipsSummary.tipsTotal,
      tipsTotal: tipsSummary.tipsTotal,
      tipsCount: tipsSummary.tipsCount,
      advancesTotal: advancesSummary.advancesTotal,
      advancesCount: advancesSummary.advancesCount,
      completedCount: completedAppointments.length,
    },
    appointments: normalizedAppointments,
    dailyGroups: buildDailyFinanceGroups({
      appointments: normalizedAppointments,
      tips,
      advances,
    }),
    editServices: editServices.map((service) => ({
      ...service,
      price: toMoneyNumber(service.price),
    })),
    editExtras: editExtras.map((extra) => ({
      ...extra,
      price: toMoneyNumber(extra.price),
    })),
    tips,
    advances,
  };
}

function FinanceMetricCard({
  icon,
  label,
  value,
  helper,
  details,
  tone,
  featured = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  details?: Array<{ label: string; value: string }>;
  tone: "emerald" | "sky" | "amber" | "neutral";
  featured?: boolean;
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
    <div
      className={`min-w-0 rounded-[20px] border p-3 backdrop-blur ${
        featured
          ? "border-emerald-300/25 bg-emerald-400/10"
          : "border-white/10 bg-white/[0.035]"
      }`}
    >
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
      {details?.length ? (
        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-xs text-zinc-300">
          {details.map((detail) => (
            <div key={detail.label} className="flex items-center justify-between gap-3">
              <span>{detail.label}</span>
              <strong className="font-semibold text-white">{detail.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function resolveFinanceRange(searchParams: SearchParams) {
  const defaultRange = getFortnightRange();
  const defaultStart = toDateValue(defaultRange.start);
  const defaultEnd = toDateValue(defaultRange.end);
  const parsedStart = parseDateValue(getFirstParam(searchParams.start)) || defaultStart;
  const parsedEnd = parseDateValue(getFirstParam(searchParams.end)) || defaultEnd;
  const start = parsedStart <= parsedEnd ? parsedStart : parsedEnd;
  const end = parsedStart <= parsedEnd ? parsedEnd : parsedStart;
  const startRange = getScheduleDayRange(start) || getScheduleDayRange(defaultStart)!;
  const endRange = getScheduleDayRange(end) || startRange;

  return {
    start,
    end,
    startDate: startRange.start,
    endDate: endRange.end,
  };
}

function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDateValue(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !getScheduleDayRange(value)) {
    return null;
  }

  return value;
}

type BarberFinanceTipRow = {
  id: string;
  clientName: string;
  amount: number;
  note: string | null;
  createdAt: Date;
};

type BarberFinanceAdvanceRow = {
  id: string;
  amount: number;
  reason: string | null;
  advanceDate: Date;
  createdAt: Date;
};

function formatDayLabel(date: Date) {
  const weekday = date.toLocaleDateString("pt-BR", {
    weekday: "short",
  });
  const day = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return `${weekday.replace(".", "")}, ${day}`;
}

function getDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDailyFinanceGroups({
  appointments,
  tips,
  advances,
}: {
  appointments: FinanceAppointmentCardData[];
  tips: BarberFinanceTipRow[];
  advances: BarberFinanceAdvanceRow[];
}) {
  const groups = new Map<
    string,
    {
      date: string;
      label: string;
      sortTime: number;
      appointments: FinanceAppointmentCardData[];
      tips: BarberFinanceTipRow[];
      advances: BarberFinanceAdvanceRow[];
      servicePayout: number;
      deliveredItemsPayout: number;
      tipsTotal: number;
      advancesTotal: number;
      netPayout: number;
    }
  >();

  function getGroup(date: Date) {
    const key = getDayKey(date);
    const current = groups.get(key);

    if (current) {
      return current;
    }

    const next = {
      date: key,
      label: formatDayLabel(date),
      sortTime: date.getTime(),
      appointments: [],
      tips: [],
      advances: [],
      servicePayout: 0,
      deliveredItemsPayout: 0,
      tipsTotal: 0,
      advancesTotal: 0,
      netPayout: 0,
    };
    groups.set(key, next);
    return next;
  }

  for (const appointment of appointments) {
    const group = getGroup(new Date(appointment.date));
    group.appointments.push(appointment);
    group.servicePayout += appointment.servicePayout;
    group.deliveredItemsPayout += appointment.deliveredItemsPayout;
    group.netPayout += appointment.payoutTotal;
  }

  for (const tip of tips) {
    const group = getGroup(tip.createdAt);
    group.tips.push(tip);
    group.tipsTotal += tip.amount;
    group.netPayout += tip.amount;
  }

  for (const advance of advances) {
    const group = getGroup(advance.advanceDate);
    group.advances.push(advance);
    group.advancesTotal += advance.amount;
    group.netPayout -= advance.amount;
  }

  return Array.from(groups.values()).sort((left, right) => right.sortTime - left.sortTime);
}

function DayValueTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5">
      <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-bold ${
          tone === "warning" ? "text-amber-200" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
