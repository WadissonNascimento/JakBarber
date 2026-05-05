import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
  const { session } = await requireActiveBarber();
  const dashboard = await getBarberDashboardData(session.user.id, searchParams);
  const barberName = session.user.name || "Barbeiro";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <Link
        href="/barber"
        className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)] hover:text-white"
      >
        <ArrowLeft className="h-4 w-4 text-[var(--brand-strong)]" />
        Voltar para o painel
      </Link>

      <PageHeader
        title={`Agenda de ${barberName}`}
        description="Horários, clientes e status dos atendimentos."
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
