import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminAgendaReport } from "@/lib/adminReports";
import { getCurrentScheduleDateValue } from "@/lib/scheduleTime";
import AdminAgendaClient from "./AdminAgendaClient";

type SearchParams = {
  barberId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  q?: string;
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
    barberId: searchParams.barberId || "",
    dateFrom: searchParams.dateFrom || getCurrentScheduleDateValue(),
    dateTo: searchParams.dateTo || getCurrentScheduleDateValue(),
    status: searchParams.status === "PENDING" ? "" : searchParams.status || "",
    q: searchParams.q || "",
  };

  const [barbers, report] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "BARBER",
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
    getAdminAgendaReport({
      barberId: initialFilters.barberId,
      dateFrom: initialFilters.dateFrom,
      dateTo: initialFilters.dateTo,
      status: initialFilters.status,
    }),
  ]);

  return (
    <AdminAgendaClient
      appointments={report.appointments}
      barbers={barbers}
      initialFilters={initialFilters}
    />
  );
}
