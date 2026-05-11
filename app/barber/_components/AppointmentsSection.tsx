"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import EmptyState from "@/components/ui/EmptyState";
import { PremiumDatePicker, PremiumSelect } from "@/components/ui/PremiumFilters";
import SectionCard from "@/components/ui/SectionCard";
import {
  getAppointmentDisplayName,
  getAppointmentServiceMetaLine,
} from "@/lib/appointmentServices";
import { getCurrentScheduleDate } from "@/lib/scheduleTime";
import { buildAppointmentContactWhatsAppUrl } from "@/lib/whatsapp";
import type { getBarberDashboardData } from "../data";
import BarberAppointmentActions from "./BarberAppointmentActions";
import BarberAppointmentCard from "./BarberAppointmentCard";

type BarberDashboardData = Awaited<ReturnType<typeof getBarberDashboardData>>;

type AppointmentsSectionProps = {
  appointments: BarberDashboardData["appointments"];
  filters: BarberDashboardData["filters"];
  barberName: string;
};

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
  const [visibleAppointments, setVisibleAppointments] = useState(appointments);
  const [isFilterPending, startFilterTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState(filters.status);
  const [selectedDate, setSelectedDate] = useState(filters.date);
  const agendaDays = useMemo(
    () => getAgendaDays(selectedDate || getTodayValue()),
    [selectedDate]
  );
  const filterDefaults = useMemo(
    () => ({
      status: filters.status,
      date: filters.date,
    }),
    [filters.date, filters.status]
  );
  const highlightedAppointmentId = useMemo(() => {
    const openAppointments = visibleAppointments.filter(
      (appointment) =>
        !["CANCELLED", "COMPLETED", "DONE", "NO_SHOW"].includes(
          appointment.status
        )
    );
    const currentDate = getCurrentScheduleDate().getTime();

    return (
      openAppointments.find(
        (appointment) => new Date(appointment.date).getTime() >= currentDate
      )?.id ||
      openAppointments[0]?.id ||
      null
    );
  }, [visibleAppointments]);

  useEffect(() => {
    setSelectedStatus(filterDefaults.status);
    setSelectedDate(filterDefaults.date);
  }, [filterDefaults.date, filterDefaults.status]);

  useEffect(() => {
    setVisibleAppointments(appointments);
  }, [appointments]);

  function handleStatusUpdated(appointmentId: string, status: string) {
    const finalStatuses = ["CANCELLED", "COMPLETED", "DONE", "NO_SHOW"];

    setVisibleAppointments((current) => {
      if (selectedStatus === "ACTIVE" && finalStatuses.includes(status)) {
        return current.filter((appointment) => appointment.id !== appointmentId);
      }

      return current.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, status } : appointment
      );
    });
  }

  function applyFilters(nextFilters = {
    status: selectedStatus,
    date: selectedDate,
  }) {
    const params = new URLSearchParams();
    const status = nextFilters.status || "ACTIVE";
    const date = nextFilters.date || getTodayValue();

    if (status && status !== "ACTIVE") {
      params.set("status", status);
    }

    if (date) {
      params.set("view", "day");
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
      description="Seus horários, clientes e próximas ações."
      className="max-w-full rounded-[28px] border-white/10 bg-white/[0.04] backdrop-blur"
      actions={
        <div className="w-full space-y-4">
          <div className="max-w-sm">
            <PremiumDatePicker
              name="date"
              label="Calendário"
              value={selectedDate || getTodayValue()}
              onChange={(value) => {
                const next = {
                  status: selectedStatus,
                  date: value || getTodayValue(),
                };

                setSelectedDate(next.date);
                applyFilters(next);
              }}
            />
          </div>

          <div className="min-w-0">
            <p className="mb-2 block text-sm text-zinc-300">Dias rápidos</p>
            <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
              {agendaDays.map((dayValue) => {
                const isSelected = dayValue === (selectedDate || getTodayValue());
                const { weekday, day } = formatAgendaDay(dayValue);

                return (
                  <button
                    key={dayValue}
                    type="button"
                    onClick={() => {
                      const next = {
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

          <div className="max-w-sm">
            <PremiumSelect
              name="status"
              label="Status"
              value={selectedStatus}
              options={[
                { value: "ACTIVE", label: "Fluxo do dia" },
                { value: "ALL", label: "Histórico completo" },
                { value: "CONFIRMED", label: "Agendado" },
                { value: "COMPLETED", label: "Concluído" },
                { value: "CANCELLED", label: "Cancelado" },
                { value: "NO_SHOW", label: "Não compareceu" },
              ]}
              onChange={(value) => {
                const next = {
                  status: value,
                  date: selectedDate,
                };

                setSelectedStatus(next.status);
                applyFilters(next);
              }}
            />
          </div>

          {isFilterPending ? (
            <p className="text-xs text-zinc-500">
              Atualizando agenda...
            </p>
          ) : null}
        </div>
      }
    >
      <div className="mt-6 space-y-3">
        <FeedbackMessage message={feedback.message} tone={feedback.tone} />
      </div>

      <div className="mt-6 space-y-4">
        {visibleAppointments.length === 0 ? (
          <EmptyState
            title="Nenhum agendamento encontrado"
            description="Ajuste os filtros acima para ver outros horários ou volte mais tarde."
          />
        ) : (
          visibleAppointments.map((appointment) => {
            const serviceName = getAppointmentDisplayName(appointment.services);
            const serviceMeta = getAppointmentServiceMetaLine(appointment.services);
            const cardAppointment = {
              id: appointment.id,
              publicId: appointment.publicId,
              date: appointment.date,
              status: appointment.status,
              isManualFitIn: appointment.isManualFitIn,
              notes: appointment.notes,
              customer: {
                id: appointment.customer.id,
                name: appointment.customer.name || "Cliente",
                phone: appointment.customer.phone || null,
                email: appointment.customer.email || null,
              },
              serviceName,
              serviceMeta,
              items: appointment.items.map((item) => ({
                id: item.id,
                productNameSnapshot: item.productNameSnapshot,
                quantity: item.quantity,
                isDelivered: item.isDelivered,
                deliveredAt: item.deliveredAt,
              })),
            };
            const contactHref = buildAppointmentContactWhatsAppUrl({
              customerName: cardAppointment.customer.name,
              barberName,
              serviceName,
              appointmentDate: appointment.date,
              customerPhone: cardAppointment.customer.phone,
            });

            return (
              <BarberAppointmentCard
                key={appointment.id}
                appointment={cardAppointment}
                highlighted={appointment.id === highlightedAppointmentId}
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
                  />
                )}
              />
            );
          })
        )}
      </div>
    </SectionCard>
  );
}
