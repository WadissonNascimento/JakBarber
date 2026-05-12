"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarRange,
  Clock3,
  DollarSign,
  PiggyBank,
  UserRound,
  Users,
} from "lucide-react";
import FeedbackMessage from "@/components/FeedbackMessage";
import { getCurrentScheduleDate } from "@/lib/scheduleTime";
import { formatCurrency } from "@/lib/utils";
import { buildAppointmentContactWhatsAppUrl } from "@/lib/whatsapp";
import type { getBarberTodayDashboardData } from "../data";
import BarberAppointmentActions from "./BarberAppointmentActions";
import BarberAppointmentCard from "./BarberAppointmentCard";
import WalkInAppointmentCard from "./WalkInAppointmentCard";

type BarberTodayDashboardData = Awaited<ReturnType<typeof getBarberTodayDashboardData>>;

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
  walkInExtras,
  clients,
}: {
  barberName: string;
  summary: BarberTodayDashboardData["summary"];
  walkInServices: BarberTodayDashboardData["walkInServices"];
  walkInExtras: BarberTodayDashboardData["walkInExtras"];
  clients: BarberTodayDashboardData["clients"];
}) {
  const [appointments, setAppointments] = useState(summary.todayAppointments);
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });

  useEffect(() => {
    setAppointments(summary.todayAppointments);
  }, [summary.todayAppointments]);

  const visibleAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          !["CANCELLED", "COMPLETED", "DONE", "NO_SHOW"].includes(
            appointment.status
          )
      ),
    [appointments]
  );
  const nextAppointment =
    visibleAppointments.find(
      (appointment) =>
        new Date(appointment.date).getTime() >= getCurrentScheduleDate().getTime()
    ) || visibleAppointments[0] || null;
  const agendaPreviewAppointments = visibleAppointments.slice(0, 3);

  function handleStatusUpdated(appointmentId: string, status: string) {
    const finalStatuses = ["CANCELLED", "COMPLETED", "DONE", "NO_SHOW"];

    setAppointments((current) => {
      if (finalStatuses.includes(status)) {
        return current.filter((item) => item.id !== appointmentId);
      }

      return current.map((item) =>
        item.id === appointmentId ? { ...item, status } : item
      );
    });

  }

  return (
    <section className="max-w-full space-y-5 overflow-hidden">
      <div className="max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4">
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
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <QuickLink href="/barber/agenda" icon={<CalendarRange />}>
            Agenda
          </QuickLink>
          <QuickLink href="/barber/disponibilidade" icon={<Clock3 />}>
            Disponibilidade
          </QuickLink>
          <QuickLink href="/barber/clientes" icon={<Users />}>
            Clientes
          </QuickLink>
          <QuickLink href="/barber/caixinhas" icon={<PiggyBank />}>
            Anotar caixinha
          </QuickLink>
          <WalkInAppointmentCard
            services={walkInServices}
            extras={walkInExtras}
            clients={clients}
            activeAppointments={summary.todayAppointments.map((appointment) => ({
              date: appointment.date,
              status: appointment.status,
              occupiedDuration: appointment.occupiedDuration,
            }))}
          />
          <QuickLink href="/barber/financeiro" icon={<DollarSign />}>
            Meu financeiro
          </QuickLink>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            label="Seu repasse"
            value={formatCurrency(summary.barberPayoutToday)}
            helper="concluído hoje"
          />
        </div>
      </div>

      <FeedbackMessage message={feedback.message} tone={feedback.tone} />

      <div className="min-w-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-white">Agenda do dia</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Horário, cliente e próxima ação.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {agendaPreviewAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-zinc-400">
                Nenhum próximo horário para hoje.
              </div>
            ) : (
              agendaPreviewAppointments.map((appointment) => {
                const contactHref = buildAppointmentContactWhatsAppUrl({
                  customerName: appointment.customer.name,
                  barberName,
                  serviceName: appointment.serviceName,
                  appointmentDate: appointment.date,
                  customerPhone: appointment.customer.phone,
                });

                return (
                  <BarberAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    highlighted={appointment.id === nextAppointment?.id}
                    contactHref={contactHref}
                    actions={(review) => (
                      <BarberAppointmentActions
                        appointmentId={appointment.id}
                        status={appointment.status}
                        onFeedback={setFeedback}
                        onStatusUpdated={handleStatusUpdated}
                        hasPickupItems={review.hasPickupItems}
                        allPickupItemsReviewed={review.allPickupItemsReviewed}
                        itemDeliveryDecisions={review.itemDeliveryDecisions}
                        services={walkInServices}
                        extras={walkInExtras}
                        currentServiceIds={(appointment.services || []).map(
                          (service) => service.serviceId
                        )}
                        currentExtraProductIds={appointment.items.map(
                          (item) => item.extraProductId || ""
                        ).filter(Boolean)}
                        notes={appointment.notes}
                      />
                    )}
                  />
                );
              })
            )}
          </div>

        <Link
          href="/barber/agenda"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)]"
        >
          Ver agenda completa
        </Link>
      </div>
    </section>
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
      className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-white transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)]"
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
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3.5">
      <div className="flex min-w-0 items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
        <span className="h-4 w-4 shrink-0 text-[var(--brand-strong)] [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <p
        title={value}
        className="mt-3 min-w-0 truncate text-xl font-bold text-white tabular-nums"
      >
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-zinc-400">{helper}</p>
    </div>
  );
}
