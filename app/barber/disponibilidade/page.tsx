import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
  const barberName = session.user.name || "barbeiro";

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
        eyebrow="Sua escala"
        title={`Disponibilidade de ${barberName}`}
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
