import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdminAgendaReport } from "@/lib/adminReports";
import { toMoneyNumber } from "@/lib/money";
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

  const report = await getAdminAgendaReport({
    dateFrom: initialFilters.dateFrom,
    dateTo: initialFilters.dateTo,
  }, { limit: ADMIN_AGENDA_PAGE_LIMIT });

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
      initialFilters={initialFilters}
      isTruncated={report.isTruncated}
      limit={report.limit}
    />
  );
}
