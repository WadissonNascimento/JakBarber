"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import EmptyState from "@/components/ui/EmptyState";
import { PremiumSelect } from "@/components/ui/PremiumFilters";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  getAppointmentDisplayName,
  getAppointmentServiceMetaLine,
} from "@/lib/appointmentServices";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
} from "@/lib/appointmentStatus";
import { buildAppointmentContactWhatsAppUrl } from "@/lib/whatsapp";
import { updateAppointmentStatusAction } from "../actions";
import { toggleAppointmentItemsDeliveredAction } from "../actions";
import type { getBarberDashboardData } from "../data";

type BarberDashboardData = Awaited<ReturnType<typeof getBarberDashboardData>>;

type AppointmentsSectionProps = {
  appointments: BarberDashboardData["appointments"];
  filters: BarberDashboardData["filters"];
  barberName: string;
};

function formatDateTime(value: Date) {
  const date = new Date(value);

  return {
    date: date.toLocaleDateString("pt-BR"),
    time: date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function getTodayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAgendaDays(selectedDate: string) {
  const days: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  for (let index = 0; index < 12; index += 1) {
    const current = new Date(base);
    current.setDate(base.getDate() + index);

    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");

    days.push(`${year}-${month}-${day}`);
  }

  if (selectedDate && !days.includes(selectedDate)) {
    return [selectedDate, ...days];
  }

  return days;
}

function formatAgendaDay(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return {
    weekday: date.toLocaleDateString("pt-BR", { weekday: "short" }),
    day: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  };
}

export function AppointmentsSection({
  appointments,
  filters,
  barberName,
}: AppointmentsSectionProps) {
  const router = useRouter();
  const pathname = usePathname() || "/barber/agenda";
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [isFilterPending, startFilterTransition] = useTransition();
  const [selectedView, setSelectedView] = useState(filters.view);
  const [selectedStatus, setSelectedStatus] = useState(filters.status);
  const [selectedDate, setSelectedDate] = useState(filters.date);
  const agendaDays = useMemo(() => getAgendaDays(selectedDate), [selectedDate]);

  const filterDefaults = useMemo(
    () => ({
      view: filters.view,
      status: filters.status,
      date: filters.date,
    }),
    [filters.date, filters.status, filters.view]
  );

  useEffect(() => {
    setSelectedView(filterDefaults.view);
    setSelectedStatus(filterDefaults.status);
    setSelectedDate(filterDefaults.date);
  }, [filterDefaults.date, filterDefaults.status, filterDefaults.view]);

  function applyFilters(nextFilters = {
    view: selectedView,
    status: selectedStatus,
    date: selectedDate,
  }) {
    const params = new URLSearchParams();
    const view = nextFilters.view || "day";
    const status = nextFilters.status || "ACTIVE";
    const date = nextFilters.date || "";

    if (view && view !== "day") {
      params.set("view", view);
    }

    if (status && status !== "ACTIVE") {
      params.set("status", status);
    }

    if (view === "day" && date) {
      params.set("date", date);
    }

    startFilterTransition(() => {
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false }
      );
    });
  }

  return (
    <SectionCard
      title="Agenda"
      description="Seus horarios, clientes e proximas acoes."
      className="max-w-full rounded-[28px] border-white/10 bg-white/[0.04] backdrop-blur"
      actions={
        <div className="w-full space-y-4">
          <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,220px)_1fr]">
            <PremiumSelect
              name="view"
              label="Visualizar"
              value={selectedView}
              options={[
                { value: "day", label: "Dia" },
                { value: "all", label: "Todos" },
              ]}
              onChange={(value) => {
                const next = {
                  view: value as typeof filters.view,
                  status: selectedStatus,
                  date: value === "day" && !selectedDate ? getTodayValue() : selectedDate,
                };

                setSelectedView(next.view);
                setSelectedDate(next.date);
                applyFilters(next);
              }}
            />

            {selectedView === "day" ? (
              <div className="min-w-0">
                <p className="mb-2 block text-sm text-zinc-300">Data</p>
                <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
                  {agendaDays.map((dayValue) => {
                    const isSelected = dayValue === selectedDate;
                    const { weekday, day } = formatAgendaDay(dayValue);

                    return (
                      <button
                        key={dayValue}
                        type="button"
                        onClick={() => {
                          const next = {
                            view: selectedView,
                            status: selectedStatus,
                            date: dayValue,
                          };

                          setSelectedDate(next.date);
                          applyFilters(next);
                        }}
                        className={`min-w-[82px] rounded-2xl border px-3 py-3 text-left transition ${
                          isSelected
                            ? "border-[var(--brand)] bg-[var(--brand-muted)] text-white shadow-[0_18px_36px_rgba(14,165,233,0.18)]"
                            : "border-white/10 bg-black/20 text-white hover:border-white/20"
                        }`}
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          {weekday}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">{day}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="max-w-sm">
            <PremiumSelect
              name="status"
              label="Status"
              value={selectedStatus}
              options={[
                { value: "ACTIVE", label: "Fluxo do dia" },
                { value: "ALL", label: "Historico completo" },
                { value: "PENDING", label: "Pendente" },
                { value: "CONFIRMED", label: "Confirmado" },
                { value: "COMPLETED", label: "Concluido" },
                { value: "CANCELLED", label: "Cancelado" },
                { value: "NO_SHOW", label: "Nao compareceu" },
              ]}
              onChange={(value) => {
                const next = {
                  view: selectedView,
                  status: value,
                  date: selectedDate,
                };

                setSelectedStatus(next.status);
                applyFilters(next);
              }}
            />
          </div>

          {isFilterPending || selectedView !== "day" ? (
            <p className="text-xs text-zinc-500">
              {isFilterPending
                ? "Atualizando agenda..."
                : "A data so vale quando o filtro estiver em Dia."}
            </p>
          ) : null}
        </div>
      }
    >
      <div className="mt-6 space-y-3">
        <FeedbackMessage message={feedback.message} tone={feedback.tone} />
      </div>

      <div className="mt-6 space-y-4">
        {appointments.length === 0 ? (
          <EmptyState
            title="Nenhum agendamento encontrado"
            description="Ajuste os filtros acima para ver outros horarios ou volte mais tarde."
          />
        ) : (
          appointments.map((appointment) => {
            const { date, time } = formatDateTime(appointment.date);
            const contactHref = buildAppointmentContactWhatsAppUrl({
              customerName: appointment.customer.name || "Cliente",
              barberName,
              serviceName: getAppointmentDisplayName(appointment.services),
              appointmentDate: appointment.date,
              customerPhone: appointment.customer.phone,
            });

            return (
              <article
                key={appointment.id}
                className="max-w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-[var(--brand)]/30 sm:p-5"
              >
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                      {date}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-white">{time}</p>
                  </div>
                  <StatusBadge
                    variant={appointmentStatusVariant(appointment.status)}
                    className="w-fit max-w-full shrink-0"
                  >
                    {appointmentStatusLabel(appointment.status)}
                  </StatusBadge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      Cliente
                    </p>
                    <Link
                      href={`/barber/clientes/${appointment.customer.id}`}
                      className="mt-2 block truncate text-lg font-semibold text-white transition hover:text-[var(--brand-strong)]"
                    >
                      {appointment.customer.name || "Cliente"}
                    </Link>
                    <p className="mt-1 break-words text-sm text-zinc-400">
                      {appointment.customer.phone || appointment.customer.email || "Sem contato"}
                    </p>
                  </div>

                  <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      Servico
                    </p>
                    <p className="mt-2 break-words text-base font-semibold text-white">
                      {getAppointmentDisplayName(appointment.services)}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {getAppointmentServiceMetaLine(appointment.services)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Observacoes
                  </p>
                  <p className="mt-2 break-words text-sm leading-5 text-zinc-300">
                    {appointment.notes || "Sem observacoes registradas"}
                  </p>
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      Extras
                    </p>
                    {appointment.items.length > 0 ? (
                      <StatusBadge variant={appointment.items.every((item) => item.isDelivered) ? "success" : "info"}>
                        {appointment.items.every((item) => item.isDelivered) ? "Entregues" : "Pendentes"}
                      </StatusBadge>
                    ) : null}
                  </div>
                  <p className="mt-2 break-words text-sm leading-5 text-zinc-300">
                    {appointment.items.length
                      ? appointment.items
                          .map((item) => `${item.productNameSnapshot} x${item.quantity}`)
                          .join(", ")
                      : "Nenhum extra nesse agendamento"}
                  </p>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Link
                      href={`/barber/clientes/${appointment.customer.id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)]"
                    >
                      Ver perfil
                    </Link>
                    <ContactAppointmentButton href={contactHref} />

                    {appointment.status === "PENDING" ? (
                      <>
                        <StatusButton
                          appointmentId={appointment.id}
                          status="CONFIRMED"
                          variant="primary"
                          onFeedback={setFeedback}
                        >
                          Confirmar
                        </StatusButton>
                        <StatusButton
                          appointmentId={appointment.id}
                          status="CANCELLED"
                          variant="danger"
                          onFeedback={setFeedback}
                        >
                          Cancelar
                        </StatusButton>
                        <StatusButton
                          appointmentId={appointment.id}
                          status="NO_SHOW"
                          variant="warning"
                          onFeedback={setFeedback}
                        >
                          Nao veio
                        </StatusButton>
                      </>
                    ) : null}

                    {appointment.status === "CONFIRMED" ? (
                      <>
                        <StatusButton
                          appointmentId={appointment.id}
                          status="COMPLETED"
                          variant="primary"
                          onFeedback={setFeedback}
                        >
                          Concluir
                        </StatusButton>
                        <StatusButton
                          appointmentId={appointment.id}
                          status="DELIVERY"
                          variant="secondary"
                          onFeedback={setFeedback}
                          action={toggleAppointmentItemsDeliveredAction}
                          hidden={appointment.items.length === 0}
                        >
                          {appointment.items.every((item) => item.isDelivered)
                            ? "Desmarcar extras"
                            : "Marcar extras entregues"}
                        </StatusButton>
                        <StatusButton
                          appointmentId={appointment.id}
                          status="NO_SHOW"
                          variant="warning"
                          onFeedback={setFeedback}
                        >
                          Nao veio
                        </StatusButton>
                        <StatusButton
                          appointmentId={appointment.id}
                          status="CANCELLED"
                          variant="danger"
                          onFeedback={setFeedback}
                        >
                          Cancelar
                        </StatusButton>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </SectionCard>
  );
}

function ContactAppointmentButton({ href }: { href: string | null }) {
  const classes =
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 hover:border-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-50";

  if (!href) {
    return (
      <button type="button" disabled className={classes}>
        Entrar em contato
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={classes}
    >
      Entrar em contato
    </a>
  );
}

function StatusButton({
  appointmentId,
  status,
  variant,
  children,
  onFeedback,
  action,
  hidden = false,
}: {
  appointmentId: string;
  status: string;
  variant: "primary" | "warning" | "danger" | "secondary";
  children: ReactNode;
  onFeedback: (feedback: {
    message: string | null;
    tone: "success" | "error" | "info";
  }) => void;
  action?: (formData: FormData) => Promise<{ ok: boolean; message: string; tone: "success" | "error" | "info" }>;
  hidden?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const classes = {
    primary: "bg-[var(--brand)] text-white hover:brightness-110",
    secondary: "border border-sky-400/35 text-sky-100 hover:bg-sky-400/10",
    warning: "border border-amber-400/50 text-amber-200 hover:bg-amber-400/10",
    danger: "border border-red-500/40 text-red-200 hover:bg-red-500/10",
  };

  if (hidden) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const formData = new FormData();
          formData.set("appointmentId", appointmentId);
          formData.set("status", status);

          const result = action
            ? await action(formData)
            : await updateAppointmentStatusAction(formData);
          onFeedback({ message: result.message, tone: result.tone });

          if (result.ok) {
            router.refresh();
          }
        });
      }}
      className={`inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${classes[variant]}`}
    >
      {isPending ? "Salvando..." : children}
    </button>
  );
}
