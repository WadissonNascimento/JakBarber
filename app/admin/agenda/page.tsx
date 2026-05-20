import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdminAgendaReport } from "@/lib/adminReports";
import { toMoneyNumber } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  getCurrentScheduleDateValue,
  getScheduleDayRange,
} from "@/lib/scheduleTime";
import { getManualFitInCustomerSnapshot } from "@/lib/manualFitIn";
import AdminAgendaClient from "./AdminAgendaClient";

const ADMIN_AGENDA_PAGE_LIMIT = 250;

type SearchParams = {
  dateFrom?: string;
  dateTo?: string;
  barberId?: string;
};

function getValidDateFilter(value: string | undefined) {
  const date = value?.trim();

  if (!date || !getScheduleDayRange(date)) {
    return "";
  }

  return date;
}

function getInitialAgendaFilters(searchParams: SearchParams) {
  const today = getCurrentScheduleDateValue();
  const dateFrom = getValidDateFilter(searchParams.dateFrom) || today;
  const dateTo = getValidDateFilter(searchParams.dateTo) || dateFrom;
  const barberId = searchParams.barberId?.trim() || "";

  if (dateFrom > dateTo) {
    return {
      dateFrom: dateTo,
      dateTo: dateFrom,
      barberId,
    };
  }

  return {
    dateFrom,
    dateTo,
    barberId,
  };
}

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/painel");
  }

  if (!session.user.shopId) {
    redirect("/logout");
  }

  const initialFilters = getInitialAgendaFilters(resolvedSearchParams);
  const shopId = session.user.shopId;

  const [report, barbers, services, extras] = await Promise.all([
    getAdminAgendaReport({
      shopId,
      barberId: initialFilters.barberId || undefined,
      dateFrom: initialFilters.dateFrom,
      dateTo: initialFilters.dateTo,
    }, { limit: ADMIN_AGENDA_PAGE_LIMIT }),
    prisma.user.findMany({
      where: {
        shopId,
        role: "BARBER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.service.findMany({
      where: {
        shopId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
        duration: true,
        barberId: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.extraProduct.findMany({
      where: {
        shopId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return (
    <AdminAgendaClient
      appointments={report.appointments.map((appointment) => ({
        id: appointment.id,
        publicId: appointment.publicId,
        date: appointment.date,
        status: appointment.status,
        paymentMethod: appointment.paymentMethod,
        notes: appointment.notes,
        barber: appointment.barber,
        customer: appointment.isManualFitIn
          ? {
              ...appointment.customer,
              name:
                getManualFitInCustomerSnapshot(appointment.notes).name ||
                "Cliente sem cadastro",
              phone: getManualFitInCustomerSnapshot(appointment.notes).phone || null,
              email: null,
            }
          : appointment.customer,
        services: appointment.services.map((service) => ({
          serviceId: service.serviceId,
          nameSnapshot: service.nameSnapshot,
          orderIndex: service.orderIndex,
          priceSnapshot: toMoneyNumber(service.priceSnapshot),
        })),
        items: appointment.items.map((item) => ({
          extraProductId: item.extraProductId,
          productNameSnapshot: item.productNameSnapshot,
          quantity: item.quantity,
          subtotal: toMoneyNumber(item.subtotal),
        })),
      }))}
      barbers={barbers}
      services={services.map((service) => ({
        ...service,
        price: toMoneyNumber(service.price),
      }))}
      extras={extras.map((extra) => ({
        ...extra,
        price: toMoneyNumber(extra.price),
      }))}
      initialFilters={initialFilters}
      isTruncated={report.isTruncated}
      limit={report.limit}
    />
  );
}
