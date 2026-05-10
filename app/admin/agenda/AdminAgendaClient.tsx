"use client";

import type { ReactNode } from "react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Search,
  Scissors,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import BackLink from "@/components/ui/BackLink";
import DashboardShell from "@/components/ui/DashboardShell";
import EmptyState from "@/components/ui/EmptyState";
import { getAppointmentItemsLabel } from "@/lib/appointmentItems";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  getAppointmentDisplayName,
  getAppointmentGrandTotal,
} from "@/lib/appointmentServices";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";
import { formatAppointmentPublicId } from "@/lib/appointmentPublicId";
import { sanitizeSearchInput } from "@/lib/inputSanitization";
import {
  formatScheduleDate,
  formatScheduleTime,
  getScheduleDateValue,
} from "@/lib/scheduleTime";

type AdminAgendaAppointment = {
  id: string;
  publicId: number;
  date: Date;
  status: string;
  notes: string | null;
  barber: {
    id: string;
    name: string | null;
  };
  customer: {
    name: string | null;
    email: string | null;
  };
  services: Array<{
    nameSnapshot: string;
    orderIndex: number;
    priceSnapshot: number;
  }>;
  items: Array<{
    productNameSnapshot: string;
    quantity: number;
    subtotal: number;
  }>;
};

const ADMIN_AGENDA_STATUS_OPTIONS = [
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;

type AdminAgendaFilters = {
  barberId: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  q: string;
};

type BarberOption = {
  id: string;
  name: string | null;
};

export default function AdminAgendaClient({
  appointments,
  barbers,
  initialFilters,
  isTruncated = false,
  limit = null,
}: {
  appointments: AdminAgendaAppointment[];
  barbers: BarberOption[];
  initialFilters: AdminAgendaFilters;
  isTruncated?: boolean;
  limit?: number | null;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    q: sanitizeSearchInput(initialFilters.q),
  }));
  const statusOptions = ADMIN_AGENDA_STATUS_OPTIONS;
  const deferredSearch = useDeferredValue(filters.q);
  const controlFilters = useMemo(
    () => ({
      barberId: filters.barberId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      status: filters.status,
      q: "",
    }),
    [filters.barberId, filters.dateFrom, filters.dateTo, filters.status]
  );

  const filteredByControls = useMemo(
    () =>
      appointments.filter((appointment) =>
        matchesAgendaFilters(appointment, controlFilters)
      ),
    [appointments, controlFilters]
  );
  const visibleAppointments = useMemo(
    () =>
      deferredSearch
        ? filteredByControls.filter((appointment) =>
            matchesAgendaSearch(appointment, deferredSearch)
          )
        : filteredByControls,
    [deferredSearch, filteredByControls]
  );
  const visibleSummary = useMemo(
    () => getVisibleAgendaSummary(visibleAppointments),
    [visibleAppointments]
  );
  const activeFilterCount = [filters.barberId, filters.dateFrom, filters.dateTo, filters.status]
    .filter(Boolean).length;

  useEffect(() => {
    window.history.replaceState(null, "", buildAgendaUrl(filters));
  }, [filters]);

  function updateFilter(key: keyof AdminAgendaFilters, value: string) {
    const nextFilters = {
      ...filters,
      [key]: key === "q" ? sanitizeSearchInput(value) : value,
    };

    setFilters(nextFilters);

    if (key !== "q") {
      router.replace(buildAgendaUrl(nextFilters), { scroll: false });
    }
  }

  function clearFilters() {
    const nextFilters = {
      ...filters,
      barberId: "",
      dateFrom: "",
      dateTo: "",
      status: "",
    };

    setFilters(nextFilters);
    router.replace(buildAgendaUrl(nextFilters), { scroll: false });
  }

  function clearSearch() {
    updateFilter("q", "");
  }

  return (
    <DashboardShell size="wide" className="max-w-full space-y-5 overflow-x-hidden">
      <section className="dashboard-panel relative z-20 max-w-full p-3 sm:p-6">
        <div className="mb-5">
          <BackLink href="/admin" area="Admin" />
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
              Painel admin
            </p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Agenda geral
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Controle todos os horários da barbearia com filtros rápidos,
              status visível e leitura confortável no celular.
            </p>
          </div>

        </div>
        <div className="mt-5 min-w-0 border-t border-white/10 pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
              Agendamentos
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              Horários encontrados
            </h2>
          </div>
          <p className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm font-semibold text-zinc-300">
            {visibleAppointments.length} registro(s)
          </p>
        </div>

        <div className="mt-3 border-t border-white/10 pt-3">
          {isTruncated ? (
            <div className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Mostrando os primeiros {limit} registros para manter a agenda rapida.
              Refine os filtros ou exporte o CSV para consultar o periodo completo.
            </div>
          ) : null}

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Filtros
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-300 transition hover:border-[var(--brand)]/45 hover:bg-[var(--brand-muted)]"
            >
              {activeFilterCount ? `Limpar ${activeFilterCount}` : "Limpar"}
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="compact-filter-line">
              <span className="compact-filter-label">Barbeiro</span>
              <select
                value={filters.barberId}
                onChange={(event) => updateFilter("barberId", event.target.value)}
                className="compact-filter-control compact-filter-control-inline"
              >
                <option value="">Todos</option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name || "Barbeiro"}
                  </option>
                ))}
              </select>
            </div>

            <div className="compact-filter-line">
              <span className="compact-filter-label">Data</span>
              <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => updateFilter("dateFrom", event.target.value)}
                  className="compact-filter-control min-w-0"
                />
                <span className="text-[11px] font-semibold text-zinc-500">até</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => updateFilter("dateTo", event.target.value)}
                  className="compact-filter-control min-w-0"
                />
              </div>
            </div>

            <div className="compact-filter-line">
              <span className="compact-filter-label">Status</span>
              <select
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
                className="compact-filter-control compact-filter-control-inline"
              >
                <option value="">Todos</option>
                {statusOptions.map((appointmentStatus) => (
                  <option key={appointmentStatus} value={appointmentStatus}>
                    {appointmentStatusLabel(appointmentStatus)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto]">
          <label className="relative block">
            <span className="sr-only">Pesquisar agendamentos</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-strong)]" />
            <input
              type="search"
              value={filters.q}
              onChange={(event) => updateFilter("q", event.target.value)}
              placeholder="Pesquisar por ID, cliente ou data"
              maxLength={120}
              className="form-control form-control-with-left-icon"
            />
          </label>

          {filters.q ? (
            <button type="button" onClick={clearSearch} className="btn-muted gap-2">
              <X className="h-4 w-4" />
              Limpar busca
            </button>
          ) : null}
        </div>

        <div className="mt-3 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
          <AgendaMetric
            icon={<ClipboardList />}
            label="Total"
            value={visibleSummary.total}
            helper="resultado visível"
          />
          <AgendaMetric
            icon={<Clock3 />}
            label="Agendados"
            value={visibleSummary.scheduled}
            helper="horários na agenda"
            tone="info"
          />
          <AgendaMetric
            icon={<CheckCircle2 />}
            label="Concluídos"
            value={visibleSummary.completed}
            helper="atendimentos finalizados"
            tone="success"
          />
          <AgendaMetric
            icon={<XCircle />}
            label="Cancelados"
            value={visibleSummary.cancelled}
            helper="cancelados ou falta"
            tone="danger"
          />
        </div>

        {visibleAppointments.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title={
                filters.q
                  ? "Nenhum resultado para a busca"
                  : "Nenhum agendamento encontrado"
              }
              description={
                filters.q
                  ? "Confira o ID, nome do cliente ou data digitada."
                  : "Ajuste os filtros para encontrar outros horários."
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-5 grid min-w-0 max-w-full gap-3 overflow-hidden md:hidden">
              {visibleAppointments.map((appointment) => (
                <AppointmentMobileCard
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </div>

            <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-white/10 bg-black/20 md:block">
              <table className="table-premium min-w-[1100px]">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Data</th>
                    <th>Hora</th>
                    <th>Barbeiro</th>
                    <th>Cliente</th>
                    <th>Serviço</th>
                    <th>Extras</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Observações</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleAppointments.map((appointment) => {
                    const date = new Date(appointment.date);

                    return (
                      <tr key={appointment.id}>
                        <td className="font-semibold text-[var(--brand-strong)]">
                          {formatAppointmentPublicId(appointment.publicId)}
                        </td>
                        <td>{formatScheduleDate(date)}</td>
                        <td>{formatScheduleTime(date)}</td>
                        <td>{appointment.barber.name}</td>
                        <td>{appointment.customer.name}</td>
                        <td>{getAppointmentDisplayName(appointment.services)}</td>
                        <td className="text-zinc-300">
                          {getAppointmentItemsLabel(appointment.items)}
                        </td>
                        <td>
                          {formatCurrency(
                            getAppointmentGrandTotal(
                              appointment.services,
                              appointment.items
                            )
                          )}
                        </td>
                        <td>
                          <StatusBadge
                            variant={appointmentStatusVariant(appointment.status)}
                          >
                            {appointmentStatusLabel(appointment.status)}
                          </StatusBadge>
                        </td>
                        <td className="max-w-xs truncate text-zinc-400">
                          {appointment.notes || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        </div>
      </section>
    </DashboardShell>
  );
}

function buildAgendaUrl(filters: AdminAgendaFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return params.toString()
    ? `/admin/agenda?${params.toString()}`
    : "/admin/agenda";
}

function matchesAgendaFilters(
  appointment: AdminAgendaAppointment,
  filters: AdminAgendaFilters
) {
  const status = normalizeAppointmentStatus(appointment.status);
  const dateValue = getScheduleDateValue(new Date(appointment.date));

  if (filters.barberId && appointment.barber.id !== filters.barberId) {
    return false;
  }

  if (filters.status && status !== filters.status) {
    return false;
  }

  if (filters.dateFrom && dateValue < filters.dateFrom) {
    return false;
  }

  if (filters.dateTo && dateValue > filters.dateTo) {
    return false;
  }

  return true;
}

function AgendaMetric({
  icon,
  label,
  value,
  helper,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  helper: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "text-white",
    info: "text-[var(--brand-strong)]",
    success: "text-emerald-300",
    warning: "text-amber-300",
    danger: "text-rose-300",
  }[tone];

  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            <span className="h-4 w-4 shrink-0 text-[var(--brand-strong)] [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </span>
            <span className="truncate">{label}</span>
          </div>
          <p className="mt-1 truncate text-xs text-zinc-400">{helper}</p>
        </div>
        <span className={`shrink-0 text-2xl font-black ${toneClass}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function getVisibleAgendaSummary(appointments: AdminAgendaAppointment[]) {
  return appointments.reduce(
    (accumulator, appointment) => {
      const status = normalizeAppointmentStatus(appointment.status);

      accumulator.total += 1;

      if (status === "COMPLETED") {
        accumulator.completed += 1;
      } else if (status === "CANCELLED" || status === "NO_SHOW") {
        accumulator.cancelled += 1;
      } else {
        accumulator.scheduled += 1;
      }

      return accumulator;
    },
    {
      total: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
    }
  );
}

function AppointmentMobileCard({
  appointment,
}: {
  appointment: AdminAgendaAppointment;
}) {
  const date = new Date(appointment.date);
  const total = getAppointmentGrandTotal(appointment.services, appointment.items);
  const extras = getAppointmentItemsLabel(appointment.items);
  const notes = appointment.notes?.trim();

  return (
    <article className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            {formatAppointmentPublicId(appointment.publicId)}
          </p>
          <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-tight text-white">
            {appointment.customer.name || "Cliente"}
          </h3>
        </div>
        <StatusBadge
          variant={appointmentStatusVariant(appointment.status)}
          className="max-w-[132px] shrink-0 justify-center px-2.5 text-[10px]"
        >
          {appointmentStatusLabel(appointment.status)}
        </StatusBadge>
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-2 gap-2">
        <InfoTile icon={<CalendarDays />} label="Data" value={formatScheduleDate(date)} />
        <InfoTile icon={<Clock3 />} label="Hora" value={formatScheduleTime(date)} />
        <InfoTile
          icon={<Scissors />}
          label="Barbeiro"
          value={appointment.barber.name || "Barbeiro"}
        />
        <InfoTile icon={<BadgeDollarSign />} label="Valor" value={formatCurrency(total)} />
      </div>

      <div className="mt-3 min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
        <div className="flex items-start gap-2">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              Serviço
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-white">
              {getAppointmentDisplayName(appointment.services)}
            </p>
          </div>
        </div>

        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            Extras
          </p>
          <p className="mt-1 break-words text-sm text-zinc-300">{extras}</p>
        </div>

        {notes ? (
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              Observações
            </p>
            <p className="mt-1 break-words text-sm text-zinc-300">{notes}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        <span className="h-4 w-4 shrink-0 text-[var(--brand-strong)] [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function matchesAgendaSearch(
  appointment: AdminAgendaAppointment,
  rawQuery: string
) {
  const query = normalizeSearchValue(rawQuery);
  const queryDigits = rawQuery.replace(/\D/g, "");
  const date = new Date(appointment.date);
  const formattedPublicId = formatAppointmentPublicId(appointment.publicId);
  const formattedDate = formatScheduleDate(date);
  const dateValue = getScheduleDateValue(date);
  const searchableText = normalizeSearchValue(
    [
      appointment.id,
      appointment.publicId,
      formattedPublicId,
      appointment.customer.name,
      appointment.customer.email,
      formattedDate,
      dateValue,
    ].join(" ")
  );
  const searchableDigits = [
    appointment.id,
    appointment.publicId,
    formattedPublicId,
    formattedDate,
    dateValue,
  ]
    .join(" ")
    .replace(/\D/g, "");

  return (
    searchableText.includes(query) ||
    (queryDigits.length > 0 && searchableDigits.includes(queryDigits))
  );
}

function normalizeSearchValue(value: string | number | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
