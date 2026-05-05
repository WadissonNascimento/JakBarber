import { Prisma } from "@prisma/client";
import {
  getAppointmentDisplayName,
  getAppointmentGrandTotal,
} from "@/lib/appointmentServices";
import { getAppointmentItemsLabel } from "@/lib/appointmentItems";
import { prisma } from "@/lib/prisma";
import {
  APPOINTMENT_STATUSES,
  appointmentStatusLabel,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";
import { formatAppointmentPublicId } from "@/lib/appointmentPublicId";
import { orderStatusLabel } from "@/lib/orderStatus";
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

export type AdminOrdersFilters = {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
};

export const ADMIN_ORDER_STATUSES = Object.keys(orderStatusLabel);

function parseStartDate(date?: string) {
  return date ? new Date(`${date}T00:00:00`) : undefined;
}

function parseEndDate(date?: string) {
  return date ? new Date(`${date}T23:59:59`) : undefined;
}

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

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
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

export function buildOrdersReportQuery(filters: AdminOrdersFilters) {
  const startDate = parseStartDate(filters.dateFrom);
  const endDate = parseEndDate(filters.dateTo);
  const normalizedStatus = filters.status?.trim().toUpperCase();

  const where: Prisma.OrderWhereInput = {
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
    ...(normalizedStatus ? { status: normalizedStatus } : {}),
  };

  return where;
}

export async function getAdminAgendaReport(filters: AdminAgendaFilters) {
  const appointments = await prisma.appointment.findMany({
    where: buildAgendaReportQuery(filters),
    include: {
      barber: true,
      customer: true,
      items: true,
      services: true,
    },
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

export async function getAdminOrdersReport(filters: AdminOrdersFilters) {
  const orders = await prisma.order.findMany({
    where: buildOrdersReportQuery(filters),
    include: {
      customer: true,
      coupon: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const summary = orders.reduce(
    (accumulator, order) => {
      accumulator.total += 1;
      accumulator.revenue += order.status === "CANCELLED" ? 0 : order.total;

      if (order.status === "PENDING") {
        accumulator.pending += 1;
      }

      if (order.status === "SHIPPED" || order.status === "DELIVERED") {
        accumulator.fulfilled += 1;
      }

      if (order.status === "CANCELLED") {
        accumulator.cancelled += 1;
      }

      return accumulator;
    },
    {
      total: 0,
      revenue: 0,
      pending: 0,
      fulfilled: 0,
      cancelled: 0,
    }
  );

  return {
    orders,
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

export function buildOrdersCsv(
  orders: Awaited<ReturnType<typeof getAdminOrdersReport>>["orders"]
) {
  const header = [
    "Data",
    "Cliente",
    "Email",
    "Status",
    "Cupom",
    "Total",
    "Subtotal",
    "Frete",
    "Desconto",
    "Rastreio",
    "Endereco",
    "Itens",
  ];

  const rows = orders.map((order) => [
    `${formatDate(order.createdAt)} ${formatTime(order.createdAt)}`,
    order.customer.name || order.customer.email || "Cliente",
    order.customer.email || "",
    orderStatusLabel[order.status] || order.status,
    order.coupon?.code || "",
    formatCurrency(order.total),
    formatCurrency(order.subtotal),
    formatCurrency(order.shippingCost),
    formatCurrency(order.discountTotal),
    order.trackingCode || "",
    order.shippingAddress || "",
    order.items.map((item) => `${item.productNameSnapshot} x${item.quantity}`).join(", "),
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(";"))
    .join("\n");
}

export const ADMIN_APPOINTMENT_STATUSES = APPOINTMENT_STATUSES;
