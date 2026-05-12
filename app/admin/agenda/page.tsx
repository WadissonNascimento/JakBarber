import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdminAgendaReport } from "@/lib/adminReports";
import { toMoneyNumber } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getCurrentScheduleDateValue } from "@/lib/scheduleTime";
import AdminAgendaClient from "./AdminAgendaClient";

const ADMIN_AGENDA_PAGE_LIMIT = 250;

type SearchParams = {
  dateFrom?: string;
  dateTo?: string;
};

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/painel");
  }

  const initialFilters = {
    dateFrom: searchParams.dateFrom || getCurrentScheduleDateValue(),
    dateTo: searchParams.dateTo || getCurrentScheduleDateValue(),
  };

  const [report, barbers, services, extras] = await Promise.all([
    getAdminAgendaReport({
      dateFrom: initialFilters.dateFrom,
      dateTo: initialFilters.dateTo,
    }, { limit: ADMIN_AGENDA_PAGE_LIMIT }),
    prisma.user.findMany({
      where: {
        role: "BARBER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.service.findMany({
      where: {
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
        ...appointment,
        services: appointment.services.map((service) => ({
          ...service,
          priceSnapshot: toMoneyNumber(service.priceSnapshot),
        })),
        items: appointment.items.map((item) => ({
          ...item,
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
