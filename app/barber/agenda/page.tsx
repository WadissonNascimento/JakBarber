import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { AppointmentsSection } from "../_components/AppointmentsSection";
import WalkInAppointmentCard from "../_components/WalkInAppointmentCard";
import { getBarberDashboardData } from "../data";
import { requireActiveBarber } from "../guard";

type SearchParams = {
  view?: "day" | "today" | "upcoming" | "all";
  status?: string;
  date?: string;
  feedback?: string;
  tone?: string;
};

export default async function BarberAgendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { session } = await requireActiveBarber();
  const dashboard = await getBarberDashboardData(session.user.id, searchParams);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <PageHeader
        title="Agenda do barbeiro"
        description="Horários, clientes e status dos atendimentos."
        actions={
          <div className="flex flex-wrap gap-3">
            <WalkInAppointmentCard
              services={dashboard.walkInServices}
              activeAppointments={dashboard.summary.todayAppointments.map((appointment) => ({
                date: appointment.date,
                status: appointment.status,
                occupiedDuration: appointment.occupiedDuration,
              }))}
            />
            <Link
              href="/barber"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              Voltar
            </Link>
          </div>
        }
      />

      <div className="mt-6">
        <AppointmentsSection
          appointments={dashboard.appointments}
          filters={dashboard.filters}
          barberName={session.user.name || "Barbeiro"}
        />
      </div>
    </div>
  );
}
