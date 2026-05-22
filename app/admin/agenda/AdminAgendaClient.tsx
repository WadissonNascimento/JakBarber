"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardList,
  UsersRound,
  Scissors,
  UserRound,
  XCircle,
} from "lucide-react";
import BackLink from "@/components/ui/BackLink";
import DashboardShell from "@/components/ui/DashboardShell";
import EmptyState from "@/components/ui/EmptyState";
import OperationalFeedbackDialog, {
  type OperationalFeedbackState,
} from "@/components/ui/OperationalFeedbackDialog";
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
import {
  APPOINTMENT_PAYMENT_METHODS,
  paymentMethodLabel,
  type AppointmentPaymentMethod,
} from "@/lib/paymentMethods";
import {
  editAdminAppointmentAction,
  updateAdminAppointmentStatusAction,
} from "./actions";
import { formatAppointmentPublicId } from "@/lib/appointmentPublicId";
import {
  formatScheduleDate,
  formatScheduleTime,
  getCurrentScheduleDateValue,
  getScheduleDateValue,
} from "@/lib/scheduleTime";

export type AdminAgendaAppointment = {
  id: string;
  publicId: number;
  date: Date;
  status: string;
  paymentMethod: string | null;
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
    serviceId: string;
    nameSnapshot: string;
    orderIndex: number;
    priceSnapshot: number;
  }>;
  items: Array<{
    extraProductId: string;
    productNameSnapshot: string;
    quantity: number;
    subtotal: number;
  }>;
};

export type AdminAgendaBarber = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type AdminAgendaService = {
  id: string;
  name: string;
  price: number;
  duration: number;
  barberId: string | null;
};

export type AdminAgendaExtra = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type AdminAgendaFilters = {
  dateFrom: string;
  dateTo: string;
  barberId?: string;
  q?: string;
};

export default function AdminAgendaClient({
  appointments,
  barbers,
  services,
  extras,
  initialFilters,
  isTruncated = false,
  limit = null,
}: {
  appointments: AdminAgendaAppointment[];
  barbers: AdminAgendaBarber[];
  services: AdminAgendaService[];
  extras: AdminAgendaExtra[];
  initialFilters: AdminAgendaFilters;
  isTruncated?: boolean;
  limit?: number | null;
}) {
  const router = useRouter();
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [isFilterPending, startFilterTransition] = useTransition();
  const visibleAppointments = useMemo(
    () =>
      appointments.filter((appointment) =>
        matchesAgendaFilters(appointment, appliedFilters)
      ),
    [appointments, appliedFilters]
  );
  const visibleSummary = useMemo(
    () => getVisibleAgendaSummary(visibleAppointments),
    [visibleAppointments]
  );

  useEffect(() => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }, [initialFilters]);

  function updateDraftFilter(key: keyof AdminAgendaFilters, value: string) {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters = normalizeAgendaDateFilters(draftFilters);

    setDraftFilters(nextFilters);
    startFilterTransition(() => {
      router.push(buildAgendaUrl(nextFilters), { scroll: false });
    });
  }

  function clearFilters() {
    const today = getCurrentScheduleDateValue();
    setDraftFilters({ dateFrom: today, dateTo: today, barberId: "" });
    startFilterTransition(() => {
      router.push("/admin/agenda", { scroll: false });
    });
  }

  function applyBarberFilter(barberId: string) {
    const nextFilters = normalizeAgendaDateFilters({
      ...draftFilters,
      barberId,
    });

    setDraftFilters(nextFilters);
    startFilterTransition(() => {
      router.push(buildAgendaUrl(nextFilters), { scroll: false });
    });
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

          <form
            onSubmit={applyFilters}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                  Filtro por data
                </p>

                <div className="mt-3">
                  <div className="grid gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-center">
                    <span className="compact-filter-label">Data</span>
                    <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
                      <input
                        type="date"
                        value={draftFilters.dateFrom}
                        max={draftFilters.dateTo || undefined}
                        onChange={(event) =>
                          updateDraftFilter("dateFrom", event.target.value)
                        }
                        className="compact-filter-control min-w-0"
                      />
                      <span className="text-[11px] font-semibold text-zinc-500">
                        até
                      </span>
                      <input
                        type="date"
                        value={draftFilters.dateTo}
                        min={draftFilters.dateFrom || undefined}
                        onChange={(event) =>
                          updateDraftFilter("dateTo", event.target.value)
                        }
                        className="compact-filter-control min-w-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:shrink-0 lg:mt-0">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={isFilterPending}
                  className="min-h-10 rounded-xl border border-white/10 px-4 text-sm font-bold text-zinc-200 transition hover:bg-white/[0.06] disabled:opacity-60"
                >
                  Limpar
                </button>
                <button
                  type="submit"
                  disabled={isFilterPending}
                  className="min-h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {isFilterPending ? "Aplicando..." : "Aplicar"}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                Barbeiros
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Toque na foto para ver somente a agenda do profissional.
              </p>
            </div>
            {draftFilters.barberId ? (
              <button
                type="button"
                onClick={() => applyBarberFilter("")}
                disabled={isFilterPending}
                className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:bg-white/[0.06] disabled:opacity-60"
              >
                Todos
              </button>
            ) : null}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <BarberFilterButton
              active={!draftFilters.barberId}
              label="Todos"
              image={null}
              icon={<UsersRound />}
              onClick={() => applyBarberFilter("")}
              disabled={isFilterPending}
            />
            {barbers.map((barber) => (
              <BarberFilterButton
                key={barber.id}
                active={draftFilters.barberId === barber.id}
                label={barber.name || barber.email || "Barbeiro"}
                image={barber.image}
                onClick={() => applyBarberFilter(barber.id)}
                disabled={isFilterPending}
              />
            ))}
          </div>
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
                appliedFilters.q
                  ? "Nenhum resultado para a busca"
                  : "Nenhum agendamento encontrado"
              }
              description={
                appliedFilters.q
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
                  barbers={barbers}
                  services={services}
                  extras={extras}
                />
              ))}
            </div>

            <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-white/10 bg-black/20 md:block">
              <table className="table-premium min-w-[1200px]">
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
                    <th>Ações</th>
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
                          {normalizeAppointmentStatus(appointment.status) ===
                          "COMPLETED" ? (
                            <p className="mt-1 text-[11px] font-bold text-emerald-200">
                              {paymentMethodLabel(appointment.paymentMethod)}
                            </p>
                          ) : null}
                        </td>
                        <td className="max-w-xs truncate text-zinc-400">
                          {appointment.notes || "-"}
                        </td>
                        <td>
                          <AdminAppointmentActions
                            appointment={appointment}
                            barbers={barbers}
                            services={services}
                            extras={extras}
                          />
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

function normalizeAgendaDateFilters(filters: AdminAgendaFilters) {
  const dateFrom = filters.dateFrom.trim();
  const dateTo = filters.dateTo.trim();
  const barberId = filters.barberId?.trim() || "";

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return {
      ...filters,
      dateFrom: dateTo,
      dateTo: dateFrom,
      barberId,
    };
  }

  return {
    ...filters,
    dateFrom,
    dateTo,
    barberId,
  };
}

function matchesAgendaFilters(
  appointment: AdminAgendaAppointment,
  filters: AdminAgendaFilters
) {
  const dateValue = getScheduleDateValue(new Date(appointment.date));

  if (filters.dateFrom && dateValue < filters.dateFrom) {
    return false;
  }

  if (filters.dateTo && dateValue > filters.dateTo) {
    return false;
  }

  if (filters.barberId && appointment.barber.id !== filters.barberId) {
    return false;
  }

  return true;
}

function BarberFilterButton({
  active,
  label,
  image,
  icon,
  disabled,
  onClick,
}: {
  active: boolean;
  label: string;
  image: string | null;
  icon?: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-w-[6rem] shrink-0 flex-col items-center gap-2 rounded-2xl border px-3 py-3 text-center transition disabled:opacity-60 ${
        active
          ? "border-[var(--brand)]/60 bg-[var(--brand-muted)] text-white"
          : "border-white/10 bg-black/20 text-zinc-300 hover:border-white/20 hover:bg-white/[0.05]"
      }`}
    >
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] text-lg font-black text-[var(--brand-strong)]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={label}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : icon ? (
          <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        ) : (
          label.slice(0, 1).toUpperCase()
        )}
      </span>
      <span className="line-clamp-2 max-w-24 text-xs font-bold leading-tight">
        {label}
      </span>
    </button>
  );
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
  barbers,
  services,
  extras,
}: {
  appointment: AdminAgendaAppointment;
  barbers: AdminAgendaBarber[];
  services: AdminAgendaService[];
  extras: AdminAgendaExtra[];
}) {
  const date = new Date(appointment.date);
  const total = getAppointmentGrandTotal(appointment.services, appointment.items);
  const extrasLabel = getAppointmentItemsLabel(appointment.items);
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

      {normalizeAppointmentStatus(appointment.status) === "COMPLETED" ? (
        <div className="mt-3 inline-flex rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100">
          {paymentMethodLabel(appointment.paymentMethod)}
        </div>
      ) : null}

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
          <p className="mt-1 break-words text-sm text-zinc-300">{extrasLabel}</p>
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
      <div className="mt-3">
        <AdminAppointmentActions
          appointment={appointment}
          barbers={barbers}
          services={services}
          extras={extras}
        />
      </div>
    </article>
  );
}

export function AdminAppointmentActions({
  appointment,
  barbers,
  services,
  extras,
}: {
  appointment: AdminAgendaAppointment;
  barbers: AdminAgendaBarber[];
  services: AdminAgendaService[];
  extras: AdminAgendaExtra[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPaymentPromptOpen, setIsPaymentPromptOpen] = useState(false);
  const [actionFeedback, setActionFeedback] =
    useState<OperationalFeedbackState>(null);
  const status = normalizeAppointmentStatus(appointment.status);
  const isCompleted = status === "COMPLETED";
  const canEdit = !["CANCELLED", "NO_SHOW"].includes(status);
  const canChangeStatus = !["CANCELLED", "NO_SHOW"].includes(status);
  const actionPending = isPending || isSubmitting;

  function runStatus(
    nextStatus: string,
    paymentMethod?: AppointmentPaymentMethod
  ) {
    if (actionPending) {
      return;
    }

    if (nextStatus === "COMPLETED" && !paymentMethod) {
      setIsPaymentPromptOpen(true);
      return;
    }

    const reason =
      nextStatus === "CANCELLED"
        ? window.prompt("Motivo do cancelamento:")?.trim()
        : "";

    if (nextStatus === "CANCELLED" && !reason) {
      return;
    }

    setIsSubmitting(true);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("appointmentId", appointment.id);
        formData.set("status", nextStatus);

        if (paymentMethod) {
          formData.set("paymentMethod", paymentMethod);
        }

        if (reason) {
          formData.set("cancellationReason", reason);
        }

        const result = await updateAdminAppointmentStatusAction(formData);

        if (result.ok) {
          setActionFeedback(null);
          setIsPaymentPromptOpen(false);
          router.refresh();
        } else {
          setActionFeedback({
            title:
              nextStatus === "COMPLETED"
                ? "Nao foi possivel concluir"
                : "Nao foi possivel atualizar",
            message: result.message,
            tone: "error",
          });
        }
      } catch {
        setActionFeedback({
          title: "Erro ao salvar",
          message:
            "Nao foi possivel atualizar o atendimento agora. Confira sua conexao e tente novamente.",
          tone: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
    });
  }

  return (
    <>
    <div className="grid min-w-[220px] grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {canEdit ? (
        <button
          type="button"
          disabled={actionPending}
          onClick={() => setIsEditing(true)}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-100 transition hover:bg-white/[0.06] disabled:opacity-60"
        >
          Editar
        </button>
      ) : null}

      {canChangeStatus ? (
        <>
          {isCompleted ? (
            <button
              type="button"
              disabled={actionPending}
              onClick={() => runStatus("CONFIRMED")}
              className="rounded-xl border border-sky-300/35 px-3 py-2 text-xs font-bold text-sky-100 transition hover:bg-sky-400/10 disabled:opacity-60"
            >
              Reabrir
            </button>
          ) : (
            <button
              type="button"
              disabled={actionPending}
              onClick={() => runStatus("COMPLETED")}
              className="rounded-xl border border-emerald-300/35 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-400/10 disabled:opacity-60"
            >
              Concluir
            </button>
          )}
          <button
            type="button"
            disabled={actionPending}
            onClick={() => runStatus("NO_SHOW")}
            className="rounded-xl border border-orange-300/35 px-3 py-2 text-xs font-bold text-orange-100 transition hover:bg-orange-400/10 disabled:opacity-60"
          >
            Falta
          </button>
          <button
            type="button"
            disabled={actionPending}
            onClick={() => runStatus("CANCELLED")}
            className="rounded-xl border border-red-400/40 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-500/10 disabled:opacity-60"
          >
            Cancelar
          </button>
        </>
      ) : (
        <span className="self-center text-xs font-semibold text-zinc-500">
          Atendimento finalizado
        </span>
      )}

      {isEditing ? (
        <AdminAppointmentEditModal
          appointment={appointment}
          barbers={barbers}
          services={services}
          extras={extras}
          onClose={() => setIsEditing(false)}
        />
      ) : null}
      {isPaymentPromptOpen ? (
        <AdminPaymentMethodPrompt
          isPending={actionPending}
          onClose={() => setIsPaymentPromptOpen(false)}
          onSelect={(paymentMethod) => runStatus("COMPLETED", paymentMethod)}
        />
      ) : null}
    </div>
    <OperationalFeedbackDialog
      feedback={actionFeedback}
      onClose={() => setActionFeedback(null)}
    />
    </>
  );
}

function AdminPaymentMethodPrompt({
  isPending,
  onClose,
  onSelect,
}: {
  isPending: boolean;
  onClose: () => void;
  onSelect: (paymentMethod: AppointmentPaymentMethod) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex touch-none items-center justify-center overflow-hidden overscroll-none bg-black/75 px-4 py-5 backdrop-blur-md"
      onClick={onClose}
      onWheel={(event) => event.preventDefault()}
      onTouchMove={(event) => event.preventDefault()}
    >
      <div
        className="relative z-[410] w-full max-w-sm rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(18,22,32,0.98),rgba(8,12,20,0.98))] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.65)]"
        onClick={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
          Pagamento
        </p>
        <h3 className="mt-2 text-2xl font-black">Como o cliente pagou?</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          A forma escolhida ficara marcada nos cards e no financeiro.
        </p>

        <div className="mt-5 grid gap-2">
          {APPOINTMENT_PAYMENT_METHODS.map((paymentMethod) => (
            <button
              key={paymentMethod}
              type="button"
              disabled={isPending}
              onClick={() => onSelect(paymentMethod)}
              className="min-h-14 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-base font-black text-white transition hover:border-[var(--brand)]/60 hover:bg-[var(--brand-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentMethodLabel(paymentMethod)}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={onClose}
          className="mt-3 min-h-12 w-full rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:bg-white/[0.06] disabled:opacity-60"
        >
          Voltar
        </button>
      </div>
    </div>,
    document.body
  );
}

function AdminAppointmentEditModal({
  appointment,
  barbers,
  services,
  extras,
  onClose,
}: {
  appointment: AdminAgendaAppointment;
  barbers: AdminAgendaBarber[];
  services: AdminAgendaService[];
  extras: AdminAgendaExtra[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogFeedback, setDialogFeedback] =
    useState<OperationalFeedbackState>(null);
  const [selectedBarberId, setSelectedBarberId] = useState(appointment.barber.id);
  const date = new Date(appointment.date);
  const status = normalizeAppointmentStatus(appointment.status);
  const isCompletedEdit = ["COMPLETED", "DONE"].includes(status);
  const selectedServiceIds = new Set(
    appointment.services.map((service) => service.serviceId)
  );
  const selectedExtraIds = new Set(
    appointment.items.map((item) => item.extraProductId)
  );
  const availableServices = services.filter(
    (service) => !service.barberId || service.barberId === selectedBarberId
  );

  function submitEdit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await editAdminAppointmentAction(formData);

        if (result.ok) {
          setDialogFeedback(null);
          onClose();
          router.refresh();
        } else {
          setDialogFeedback({
            title: "Nao foi possivel salvar",
            message: result.message,
            tone: "error",
          });
        }
      } catch {
        setDialogFeedback({
          title: "Erro ao salvar",
          message:
            "Nao foi possivel salvar as alteracoes agora. Confira sua conexao e tente novamente.",
          tone: "error",
        });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[280] overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-md">
      <form
        action={submitEdit}
        className="mx-auto w-full max-w-2xl rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(18,22,32,0.98),rgba(8,12,20,0.98))] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
      >
        <input type="hidden" name="appointmentId" value={appointment.id} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
              Admin
            </p>
            <h3 className="mt-2 text-xl font-bold">
              {isCompletedEdit ? "Editar itens concluidos" : "Editar agendamento"}
            </h3>
            {isCompletedEdit ? (
              <p className="mt-1 text-sm text-zinc-400">
                Atendimento finalizado: ajuste somente servicos, extras e observacoes.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-zinc-200"
          >
            Fechar
          </button>
        </div>

        {isCompletedEdit ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ReadOnlyEditTile label="Barbeiro" value={appointment.barber.name || "Barbeiro"} />
            <ReadOnlyEditTile label="Data" value={formatScheduleDate(date)} />
            <ReadOnlyEditTile label="Hora" value={formatScheduleTime(date)} />
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-zinc-200">
              Barbeiro
              <select
                name="barberId"
                value={selectedBarberId}
                onChange={(event) => setSelectedBarberId(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-white outline-none"
              >
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name || barber.email || "Barbeiro"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-zinc-200">
              Data
              <input
                type="date"
                name="date"
                defaultValue={getScheduleDateValue(date)}
                className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-white outline-none"
              />
            </label>
            <label className="block text-sm font-semibold text-zinc-200">
              Hora
              <input
                type="time"
                name="time"
                defaultValue={formatScheduleTime(date)}
                className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-white outline-none"
              />
            </label>
          </div>
        )}

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Serviços
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {availableServices.map((service) => (
              <label
                key={service.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="serviceIds"
                  value={service.id}
                  defaultChecked={selectedServiceIds.has(service.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">
                    {service.name}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {service.duration} min - {formatCurrency(service.price)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Extras
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {extras.map((extra) => (
              <label
                key={extra.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="extraProductIds"
                  value={extra.id}
                  defaultChecked={selectedExtraIds.has(extra.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">
                    {extra.name}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {formatCurrency(extra.price)} - estoque {extra.stock}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="mt-5 block text-sm font-semibold text-zinc-200">
          Observações
          <textarea
            name="notes"
            rows={3}
            maxLength={400}
            defaultValue={appointment.notes || ""}
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 min-h-11 w-full rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
      <OperationalFeedbackDialog
        feedback={dialogFeedback}
        onClose={() => setDialogFeedback(null)}
      />
    </div>
  );
}

function ReadOnlyEditTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
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
