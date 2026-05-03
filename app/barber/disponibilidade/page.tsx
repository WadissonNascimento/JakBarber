import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { AvailabilitySection } from "../_components/AvailabilitySection";
import { getBarberDashboardData } from "../data";
import { requireActiveBarber } from "../guard";

export default async function BarberAvailabilityPage({
}: {
  searchParams?: { feedback?: string; tone?: string };
}) {
  const { session } = await requireActiveBarber();
  const dashboard = await getBarberDashboardData(session.user.id, {
    view: "day",
    status: "ALL",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <PageHeader
        title="Disponibilidade"
        description="Horários da semana, pausas e bloqueios."
        actions={
          <Link
            href="/barber"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            Voltar
          </Link>
        }
      />

      <div className="mt-6">
        <AvailabilitySection
          availabilities={dashboard.availabilities}
          blocks={dashboard.blocks}
          recurringBlocks={dashboard.recurringBlocks}
        />
      </div>
    </div>
  );
}
