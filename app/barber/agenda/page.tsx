import { unstable_noStore as noStore } from "next/cache";
import BackLink from "@/components/ui/BackLink";
import PageHeader from "@/components/ui/PageHeader";
import { AppointmentsSection } from "../_components/AppointmentsSection";
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
  noStore();

  const { barber } = await requireActiveBarber();
  const dashboard = await getBarberDashboardData(barber.id, searchParams);
  const barberName = barber.name || "Barbeiro";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <BackLink href="/barber" area="Painel" className="mb-5" />

      <PageHeader
        title={`Agenda de ${barberName}`}
        description="Horários, clientes e status dos atendimentos."
        variant="plain"
      />

      <div className="mt-6">
        <AppointmentsSection
          appointments={dashboard.appointments}
          filters={dashboard.filters}
          barberName={barberName}
        />
      </div>
    </div>
  );
}
