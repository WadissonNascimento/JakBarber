import { unstable_noStore as noStore } from "next/cache";
import { Wallet } from "lucide-react";
import BackLink from "@/components/ui/BackLink";
import DashboardShell from "@/components/ui/DashboardShell";
import EmptyState from "@/components/ui/EmptyState";
import { resolveFinanceRange, type FinancePeriod } from "@/lib/financeReports";
import { toMoneyNumber } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { requireTenantSession, SHOP_ADMIN_ROLES } from "@/lib/tenantSession";
import FinancePeriodFilters from "../financeiro/FinancePeriodFilters";
import AdminAdvanceForm from "./AdminAdvanceForm";

type SearchParams = {
  period?: FinancePeriod;
  start?: string;
  end?: string;
};

function formatDate(value: Date) {
  return value.toLocaleDateString("pt-BR");
}

function formatDateTime(value: Date) {
  return value.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function AdminAdvancesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  noStore();

  const filters = (await searchParams) || {};
  const { shopId } = await requireTenantSession({
    roles: SHOP_ADMIN_ROLES,
  });
  const range = resolveFinanceRange(filters);
  const [barbers, advances] = await Promise.all([
    prisma.user.findMany({
      where: {
        shopId,
        role: "BARBER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.barberAdvance.findMany({
      where: {
        shopId,
        advanceDate: {
          gte: range.start,
          lte: range.end,
        },
      },
      include: {
        barber: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        advanceDate: "desc",
      },
    }),
  ]);
  const total = advances.reduce((sum, item) => sum + toMoneyNumber(item.amount), 0);
  const barberCount = new Set(advances.map((item) => item.barberId)).size;
  const barberOptions = barbers.map((barber) => ({
    id: barber.id,
    name: barber.name || "Barbeiro",
  }));

  return (
    <DashboardShell size="wide" className="min-w-0 max-w-full overflow-hidden">
      <section className="dashboard-panel max-w-full p-4 sm:p-6">
        <div className="mb-5">
          <BackLink href="/admin" area="Admin" />
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-400/10 text-amber-200">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
              Painel admin
            </p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Vales dos barbeiros
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Lance vales para a equipe e consulte datas, motivos e descontos
              aplicados nos repasses.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <AdminAdvanceMetric label="Total em vales" value={formatCurrency(total)} />
          <AdminAdvanceMetric label="Registros" value={`${advances.length}`} />
          <AdminAdvanceMetric label="Barbeiros" value={`${barberCount}`} />
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
              Novo vale
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              Lancar para barbeiro
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Escolha o barbeiro e o valor. A data e automatica e entra na
              quinzena atual.
            </p>
          </div>
          <AdminAdvanceForm barbers={barberOptions} />
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
              Periodo
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">Filtro de vales</h2>
          </div>
          <FinancePeriodFilters
            period={range.period}
            start={range.start.toISOString().slice(0, 10)}
            end={range.end.toISOString().slice(0, 10)}
          />
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                {formatDate(range.start)} ate {formatDate(range.end)}
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">Lancamentos</h2>
            </div>
            <strong className="shrink-0 text-lg font-black text-amber-200">
              {formatCurrency(total)}
            </strong>
          </div>

          {advances.length === 0 ? (
            <EmptyState
              title="Nenhum vale no periodo"
              description="Quando o admin lancar vales, eles aparecem aqui."
            />
          ) : (
            <div className="max-w-full overflow-x-auto">
              <table className="table-premium min-w-[760px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Barbeiro</th>
                    <th className="px-4 py-3">Data do vale</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Lancado em</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map((advance) => (
                    <tr key={advance.id}>
                      <td className="px-4 py-3">
                        {advance.barber.name || "Barbeiro"}
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(advance.advanceDate)}
                      </td>
                      <td className="px-4 py-3 font-bold text-amber-200">
                        - {formatCurrency(advance.amount)}
                      </td>
                      <td className="max-w-[18rem] px-4 py-3 text-zinc-300">
                        <span className="line-clamp-2">{advance.reason || "-"}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {formatDateTime(advance.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </DashboardShell>
  );
}

function AdminAdvanceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 truncate text-2xl font-black text-white">{value}</p>
    </div>
  );
}
