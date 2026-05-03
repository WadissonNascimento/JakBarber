"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  CalendarRange,
  Clock3,
  DollarSign,
  Scissors,
  UserRound,
  Users,
} from "lucide-react";
import FeedbackMessage from "@/components/FeedbackMessage";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
} from "@/lib/appointmentStatus";
import {
  formatScheduleDate,
  formatScheduleTime,
  getCurrentScheduleDate,
} from "@/lib/scheduleTime";
import { formatCurrency } from "@/lib/utils";
import { buildAppointmentContactWhatsAppUrl } from "@/lib/whatsapp";
import { updateAppointmentStatusAction } from "../actions";
import type { getBarberDashboardData } from "../data";
import WalkInAppointmentCard from "./WalkInAppointmentCard";

type BarberDashboardData = Awaited<ReturnType<typeof getBarberDashboardData>>;
type DashboardAppointment = BarberDashboardData["summary"]["todayAppointments"][number];

function formatTime(date: Date) {
  return formatScheduleTime(new Date(date));
}

function formatDateLabel(date: Date) {
  return formatScheduleDate(new Date(date), {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTodayLabel() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function BarberTodayDashboard({
  barberName,
  summary,
  walkInServices,
}: {
  barberName: string;
  summary: BarberDashboardData["summary"];
  walkInServices: BarberDashboardData["walkInServices"];
}) {
  const router = useRouter();
  const [appointments, setAppointments] = useState(summary.todayAppointments);
  const [upcomingAppointments, setUpcomingAppointments] = useState(
    summary.nextAppointments
  );
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          !["CANCELLED", "COMPLETED", "DONE", "NO_SHOW"].includes(appointment.status)
      ),
    [appointments]
  );
  const nextAppointment =
    visibleAppointments.find(
      (appointment) =>
        new Date(appointment.date).getTime() >= getCurrentScheduleDate().getTime()
    ) || visibleAppointments[0] || null;
  const visibleUpcomingAppointments = upcomingAppointments.slice(0, 3);

  function updateStatus(appointment: DashboardAppointment, status: string) {
    setPendingKey(`${appointment.id}-${status}`);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("appointmentId", appointment.id);
      formData.set("status", status);

      const result = await updateAppointmentStatusAction(formData);
      setFeedback({ message: result.message, tone: result.tone });

      if (result.ok) {
        const finalStatuses = ["CANCELLED", "COMPLETED", "DONE", "NO_SHOW"];

        setAppointments((current) => {
          if (finalStatuses.includes(status)) {
            return current.filter((item) => item.id !== appointment.id);
          }

          return current.map((item) =>
            item.id === appointment.id ? { ...item, status } : item
          );
        });
        setUpcomingAppointments((current) => {
          if (finalStatuses.includes(status)) {
            return current.filter((item) => item.id !== appointment.id);
          }

          return current.map((item) =>
            item.id === appointment.id ? { ...item, status } : item
          );
        });
        router.refresh();
      }

      setPendingKey(null);
    });
  }

  return (
    <section className="max-w-full space-y-5 overflow-hidden">
      <div className="max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-strong)]">
              Hoje
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              {barberName.split(" ")[0]}, sua agenda
            </h1>
            <p className="mt-2 text-sm capitalize text-zinc-400">
              {formatTodayLabel()}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:min-w-[260px] sm:w-auto">
            <QuickLink href="/barber/agenda" icon={<CalendarRange />}>
              Agenda
            </QuickLink>
            <QuickLink href="/barber/disponibilidade" icon={<Clock3 />}>
              Disponibilidade
            </QuickLink>
            <QuickLink href="/barber/clientes" icon={<Users />}>
              Clientes
            </QuickLink>
            <QuickLink href="/barber/servicos" icon={<Scissors />}>
              Serviços
            </QuickLink>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <WalkInAppointmentCard
            services={walkInServices}
            activeAppointments={summary.todayAppointments.map((appointment) => ({
              date: appointment.date,
              status: appointment.status,
              occupiedDuration: appointment.occupiedDuration,
            }))}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<CalendarRange />}
            label="Atendimentos"
            value={`${appointments.length}`}
            helper={`${summary.completedToday} concluídos`}
          />
          <MetricCard
            icon={<UserRound />}
            label="Clientes"
            value={`${summary.clientsToday}`}
            helper="passam hoje"
          />
          <MetricCard
            icon={<DollarSign />}
            label="Previsto"
            value={formatCurrency(summary.scheduledRevenueToday)}
            helper="agenda ativa"
          />
          <MetricCard
            icon={<DollarSign />}
            label="Seu repasse"
            value={formatCurrency(summary.barberPayoutToday)}
            helper="concluído hoje"
          />
        </div>
      </div>

      <FeedbackMessage message={feedback.message} tone={feedback.tone} />

      <div className="grid max-w-full gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="min-w-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-white">Agenda do dia</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Horário, cliente e próxima ação.
              </p>
            </div>
            <Link
              href="/barber/agenda"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)]"
            >
              Ver tudo
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {visibleAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-zinc-400">
                Nenhum próximo horário para hoje.
              </div>
            ) : (
              visibleAppointments.map((appointment) => (
                <TodayAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  barberName={barberName}
                  highlighted={appointment.id === nextAppointment?.id}
                  isPending={isPending}
                  pendingKey={pendingKey}
                  onUpdateStatus={updateStatus}
                />
              ))
            )}
          </div>
        </div>

        <aside className="min-w-0 space-y-5">
          <div className="min-w-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5">
            <h2 className="text-xl font-semibold text-white">Próximos agendamentos</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Pendentes e confirmados que ainda vão acontecer.
            </p>

            <div className="mt-4 space-y-3">
              {visibleUpcomingAppointments.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-zinc-400">
                  Nenhum agendamento futuro.
                </p>
              ) : (
                visibleUpcomingAppointments.map((appointment) => (
                  <UpcomingAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    barberName={barberName}
                    isPending={isPending}
                    pendingKey={pendingKey}
                    onUpdateStatus={updateStatus}
                  />
                ))
              )}
            </div>

            <Link
              href="/barber/agenda"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)]"
            >
              Ver agenda completa
            </Link>
          </div>

          <div className="min-w-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5">
            <h2 className="text-xl font-semibold text-white">Próximo horário</h2>
            {nextAppointment ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-4xl font-bold text-white">
                  {formatTime(nextAppointment.date)}
                </p>
                <p className="mt-3 font-semibold text-white">
                  {nextAppointment.customer.name}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {nextAppointment.serviceName}
                </p>
                <Link
                  href={`/barber/clientes/${nextAppointment.customer.id}`}
                  className="mt-4 inline-flex rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Abrir cliente
                </Link>
                <ContactLink
                  href={buildAppointmentContactWhatsAppUrl({
                    customerName: nextAppointment.customer.name,
                    barberName,
                    serviceName: nextAppointment.serviceName,
                    appointmentDate: nextAppointment.date,
                    customerPhone: nextAppointment.customer.phone,
                  })}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
                />
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-zinc-400">
                Sem próximos horários hoje.
              </p>
            )}
          </div>

          <div className="min-w-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5">
            <h2 className="text-xl font-semibold text-white">Serviços do dia</h2>
            <div className="mt-4 space-y-3">
              {summary.todayServices.length === 0 ? (
                <p className="text-sm text-zinc-400">Sem serviços agendados.</p>
              ) : (
                summary.todayServices.slice(0, 5).map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-white">{service.name}</p>
                    <span className="rounded-full bg-[var(--brand-muted)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                      {service.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function TodayAppointmentCard({
  appointment,
  barberName,
  highlighted,
  isPending,
  pendingKey,
  onUpdateStatus,
}: {
  appointment: DashboardAppointment;
  barberName: string;
  highlighted: boolean;
  isPending: boolean;
  pendingKey: string | null;
  onUpdateStatus: (appointment: DashboardAppointment, status: string) => void;
}) {
  const contactHref = buildAppointmentContactWhatsAppUrl({
    customerName: appointment.customer.name,
    barberName,
    serviceName: appointment.serviceName,
    appointmentDate: appointment.date,
    customerPhone: appointment.customer.phone,
  });

  return (
    <article
      className={`max-w-full overflow-hidden rounded-2xl border p-4 transition ${
        highlighted
          ? "border-[var(--brand)]/50 bg-[var(--brand-muted)]"
          : "border-white/10 bg-black/20"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-white">
            {formatTime(appointment.date)}
          </p>
          <Link
            href={`/barber/clientes/${appointment.customer.id}`}
            className="mt-2 block truncate text-base font-semibold text-white hover:text-[var(--brand-strong)]"
          >
            {appointment.customer.name}
          </Link>
          <p className="mt-1 text-sm text-zinc-400">
            {appointment.serviceName}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {appointment.serviceMeta}
          </p>
        </div>
        <StatusBadge
          variant={appointmentStatusVariant(appointment.status)}
          className="w-fit max-w-full shrink-0"
        >
          {appointmentStatusLabel(appointment.status)}
        </StatusBadge>
      </div>

      {appointment.notes ? (
        <div className="mt-3 rounded-2xl border border-[var(--brand)]/20 bg-[var(--brand-muted)]/25 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
            Observação
          </p>
          <p className="mt-2 text-sm leading-5 text-zinc-200">
            {appointment.notes}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ContactLink href={contactHref} />
        {appointment.status === "PENDING" ? (
          <ActionButton
            pending={isPending && pendingKey === `${appointment.id}-CONFIRMED`}
            onClick={() => onUpdateStatus(appointment, "CONFIRMED")}
          >
            Confirmar
          </ActionButton>
        ) : null}
        {appointment.status === "CONFIRMED" ? (
          <ActionButton
            pending={isPending && pendingKey === `${appointment.id}-COMPLETED`}
            onClick={() => onUpdateStatus(appointment, "COMPLETED")}
          >
            Concluir
          </ActionButton>
        ) : null}
        {["PENDING", "CONFIRMED"].includes(appointment.status) ? (
          <>
            <ActionButton
              variant="ghost"
              pending={isPending && pendingKey === `${appointment.id}-NO_SHOW`}
              onClick={() => onUpdateStatus(appointment, "NO_SHOW")}
            >
              Não veio
            </ActionButton>
            <ActionButton
              variant="danger"
              pending={isPending && pendingKey === `${appointment.id}-CANCELLED`}
              onClick={() => onUpdateStatus(appointment, "CANCELLED")}
            >
              Cancelar
            </ActionButton>
          </>
        ) : null}
      </div>
    </article>
  );
}

function UpcomingAppointmentCard({
  appointment,
  barberName,
  isPending,
  pendingKey,
  onUpdateStatus,
}: {
  appointment: DashboardAppointment;
  barberName: string;
  isPending: boolean;
  pendingKey: string | null;
  onUpdateStatus: (appointment: DashboardAppointment, status: string) => void;
}) {
  const contactHref = buildAppointmentContactWhatsAppUrl({
    customerName: appointment.customer.name,
    barberName,
    serviceName: appointment.serviceName,
    appointmentDate: appointment.date,
    customerPhone: appointment.customer.phone,
  });

  return (
    <article className="max-w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            {formatDateLabel(appointment.date)}
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {formatTime(appointment.date)}
          </p>
          <Link
            href={`/barber/clientes/${appointment.customer.id}`}
            className="mt-2 block truncate font-semibold text-white hover:text-[var(--brand-strong)]"
          >
            {appointment.customer.name}
          </Link>
          <p className="mt-1 text-sm text-zinc-400">
            {appointment.serviceName}
          </p>
        </div>
        <StatusBadge
          variant={appointmentStatusVariant(appointment.status)}
          className="w-fit max-w-full shrink-0"
        >
          {appointmentStatusLabel(appointment.status)}
        </StatusBadge>
      </div>

      {appointment.notes ? (
        <div className="mt-3 rounded-2xl border border-[var(--brand)]/20 bg-[var(--brand-muted)]/25 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
            Observação
          </p>
          <p className="mt-2 text-sm leading-5 text-zinc-200">
            {appointment.notes}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ContactLink href={contactHref} />
        {appointment.status === "PENDING" ? (
          <ActionButton
            pending={isPending && pendingKey === `${appointment.id}-CONFIRMED`}
            onClick={() => onUpdateStatus(appointment, "CONFIRMED")}
          >
            Confirmar
          </ActionButton>
        ) : null}
        {["PENDING", "CONFIRMED"].includes(appointment.status) ? (
          <ActionButton
            variant="danger"
            pending={isPending && pendingKey === `${appointment.id}-CANCELLED`}
            onClick={() => onUpdateStatus(appointment, "CANCELLED")}
          >
            Cancelar
          </ActionButton>
        ) : null}
      </div>
    </article>
  );
}

function ContactLink({
  href,
  className,
}: {
  href: string | null;
  className?: string;
}) {
  const classes =
    className ||
    "inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50";

  if (!href) {
    return (
      <button type="button" disabled className={classes}>
        Entrar em contato
      </button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={classes}>
      Entrar em contato
    </a>
  );
}

function QuickLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)]"
    >
      <span className="h-4 w-4 text-[var(--brand-strong)] [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </Link>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex min-w-0 items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
        <span className="h-4 w-4 text-[var(--brand-strong)] [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <p className="mt-3 break-words text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{helper}</p>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  pending,
  variant = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  pending: boolean;
  variant?: "primary" | "ghost" | "danger";
}) {
  const classes = {
    primary: "bg-[var(--brand)] text-white hover:brightness-110",
    ghost: "border border-white/10 text-white hover:bg-white/[0.06]",
    danger: "border border-red-500/40 text-red-200 hover:bg-red-500/10",
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className={`min-h-11 min-w-0 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${classes[variant]}`}
    >
      {pending ? "Salvando..." : children}
    </button>
  );
}
