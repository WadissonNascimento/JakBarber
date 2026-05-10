import { Prisma } from "@prisma/client";
import {
  getAppointmentDisplayName,
  getAppointmentGrandTotal,
} from "@/lib/appointmentServices";
import { getAppointmentItemsLabel } from "@/lib/appointmentItems";
import { appointmentForAdminSelect } from "@/lib/appointmentSelects";
import { prisma } from "@/lib/prisma";
import {
  APPOINTMENT_STATUSES,
  appointmentStatusLabel,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";
import { formatAppointmentPublicId } from "@/lib/appointmentPublicId";
import { toMoneyNumber, type MoneyValue } from "@/lib/money";
import {
  formatScheduleDate,
  formatScheduleTime,
  getScheduleDayRange,
} from "@/lib/scheduleTime";

export type AdminAgendaFilters = {
  barberId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
};

function parseScheduleStartDate(date?: string) {
  return date ? getScheduleDayRange(date)?.start : undefined;
}

function parseScheduleEndDate(date?: string) {
  return date ? getScheduleDayRange(date)?.end : undefined;
}

function formatDate(date: Date) {
  return formatScheduleDate(date);
}

function formatTime(date: Date) {
  return formatScheduleTime(date);
}

function formatCurrency(value: MoneyValue) {
  return toMoneyNumber(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
}

export function buildAgendaReportQuery(filters: AdminAgendaFilters) {
  const startDate = parseScheduleStartDate(filters.dateFrom);
  const endDate = parseScheduleEndDate(filters.dateTo);
  const normalizedStatus = filters.status?.trim().toUpperCase();

  const where: Prisma.AppointmentWhereInput = {
    ...(filters.barberId ? { barberId: filters.barberId } : {}),
    ...(startDate || endDate
      ? {
          date: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  };

  if (normalizedStatus) {
    where.status =
      normalizedStatus === "COMPLETED"
        ? { in: ["COMPLETED", "DONE"] }
        : normalizedStatus;
  }

  return where;
}

export async function getAdminAgendaReport(filters: AdminAgendaFilters) {
  const appointments = await prisma.appointment.findMany({
    where: buildAgendaReportQuery(filters),
    select: appointmentForAdminSelect,
    orderBy: {
      date: "asc",
    },
  });

  const summary = appointments.reduce(
    (accumulator, appointment) => {
      const normalizedStatus = normalizeAppointmentStatus(appointment.status);

      accumulator.total += 1;

      if (normalizedStatus === "COMPLETED") {
        accumulator.completed += 1;
      }

      if (normalizedStatus === "CANCELLED" || normalizedStatus === "NO_SHOW") {
        accumulator.cancelled += 1;
      }

      if (normalizedStatus === "PENDING" || normalizedStatus === "CONFIRMED") {
        accumulator.active += 1;
      }

      return accumulator;
    },
    {
      total: 0,
      completed: 0,
      cancelled: 0,
      active: 0,
    }
  );

  return {
    appointments,
    summary,
  };
}

export function buildAgendaCsv(
  appointments: Awaited<ReturnType<typeof getAdminAgendaReport>>["appointments"]
) {
  const header = [
    "ID",
    "Data",
    "Hora",
    "Barbeiro",
    "Cliente",
    "Email do cliente",
    "Servico",
    "Valor",
    "Status",
    "Extras",
    "Observacoes",
  ];

  const rows = appointments.map((appointment) => [
    formatAppointmentPublicId(appointment.publicId),
    formatDate(appointment.date),
    formatTime(appointment.date),
    appointment.barber.name || appointment.barber.email || "Barbeiro",
    appointment.customer.name || appointment.customer.email || "Cliente",
    appointment.customer.email || "",
    getAppointmentDisplayName(appointment.services),
    formatCurrency(getAppointmentGrandTotal(appointment.services, appointment.items)),
    appointmentStatusLabel(appointment.status),
    getAppointmentItemsLabel(appointment.items),
    appointment.notes || "",
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(";"))
    .join("\n");
}

export const ADMIN_APPOINTMENT_STATUSES = APPOINTMENT_STATUSES;
