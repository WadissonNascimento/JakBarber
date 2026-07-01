import { unstable_noStore as noStore } from "next/cache";
import { Wallet } from "lucide-react";
import BackLink from "@/components/ui/BackLink";
import DashboardShell from "@/components/ui/DashboardShell";
import EmptyState from "@/components/ui/EmptyState";
import { getBarberAdvanceRows } from "@/lib/barberAdvances";
import { getFortnightRange } from "@/lib/financials";
import { getCurrentScheduleDateValue } from "@/lib/scheduleTime";
import { formatCurrency } from "@/lib/utils";
import { requireActiveBarber } from "../guard";
import BarberAdvanceForm from "./BarberAdvanceForm";

function formatDateTime(value: Date) {
  return value.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function BarberAdvancesPage() {
  noStore();

  const { barber } = await requireActiveBarber();
  const barberName = barber.name || "Barbeiro";
  const range = getFortnightRange();
  const advances = await getBarberAdvanceRows({
    barberId: barber.id,
    range,
  });
  const total = advances.reduce((sum, item) => sum + item.amount, 0);

  return (
    <DashboardShell size="narrow">
      <section className="dashboard-panel p-4 sm:p-6">
        <div className="mb-5">
          <BackLink href="/barber" area="Painel" />
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-400/10 text-amber-200">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
              Painel do barbeiro
            </p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Anotar vale
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Registre vales de {barberName}. O valor entra como desconto no
              repasse da quinzena.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <BarberAdvanceForm defaultDate={getCurrentScheduleDateValue()} />
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                Quinzena atual
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">Vales anotados</h2>
            </div>
            <strong className="shrink-0 text-lg font-black text-amber-200">
              {formatCurrency(total)}
            </strong>
          </div>

          <div className="mt-4 space-y-2">
            {advances.length === 0 ? (
              <EmptyState
                title="Nenhum vale na quinzena"
                description="Quando voce anotar um vale, ele aparece aqui e no financeiro."
              />
            ) : (
              advances.map((advance) => (
                <div
                  key={advance.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">
                        {formatDateTime(advance.advanceDate)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Lancado em {formatDateTime(advance.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-black text-amber-200">
                      - {formatCurrency(advance.amount)}
                    </p>
                  </div>
                  <p className="mt-2 border-t border-white/10 pt-2 text-sm text-zinc-300">
                    {advance.reason}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </DashboardShell>
  );
}
