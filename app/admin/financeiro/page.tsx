import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { getFinanceDashboardData } from "@/lib/financeReports";
import ComparisonControls from "./ComparisonControls";
import FinancePeriodFilters from "./FinancePeriodFilters";
import FinanceHistoryFilters from "./FinanceHistoryFilters";
import GeneratePayoutsButton from "./GeneratePayoutsButton";
import PayoutActionPanel from "./PayoutActionPanel";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDelta(current: number, previous: number, mode: "currency" | "number" = "currency") {
  const delta = current - previous;
  const prefix = delta > 0 ? "+" : delta < 0 ? "-" : "";
  const absolute = Math.abs(delta);

  if (mode === "number") {
    return `${prefix}${absolute.toLocaleString("pt-BR")}`;
  }

  return `${prefix}${formatCurrency(absolute)}`;
}

function getDeltaTone(current: number, previous: number) {
  if (current > previous) return "text-emerald-300";
  if (current < previous) return "text-rose-300";
  return "text-zinc-300";
}

export default async function AdminFinanceiroPage({
  searchParams,
}: {
  searchParams?: {
    period?: "week" | "month" | "custom";
    start?: string;
    end?: string;
    historyStart?: string;
    historyEnd?: string;
    compareMode?: "auto" | "custom";
    compareStart?: string;
    compareEnd?: string;
  };
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/painel");

  const data = await getFinanceDashboardData({
    period: searchParams?.period,
    start: searchParams?.start,
    end: searchParams?.end,
    historyStart: searchParams?.historyStart,
    historyEnd: searchParams?.historyEnd,
    compareMode: searchParams?.compareMode,
    compareStart: searchParams?.compareStart,
    compareEnd: searchParams?.compareEnd,
  });
  const maxDailyRevenue = Math.max(
    ...data.analytics.dailySeries.map((item) => item.grossRevenue),
    1
  );
  const maxServiceRevenue = Math.max(
    ...data.analytics.topServices.map((item) => item.grossRevenue),
    1
  );
  const maxBarberRevenue = Math.max(
    ...data.analytics.barberInsights.map((item) => item.grossRevenue),
    1
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 text-white">
      <PageHeader
        title="Financeiro da barbearia"
        description="Veja quanto entrou, quanto deve ser pago aos barbeiros e o que fica para a barbearia."
        actions={
          <Link
            href="/admin"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            Voltar ao admin
          </Link>
        }
      />

      <SectionCard
        title="Escolha o período"
        description="Selecione os dias que quer analisar antes de gerar ou pagar os repasses."
        className="mt-6"
      >
        <FinancePeriodFilters
          period={data.filters.period}
          start={data.filters.start}
          end={data.filters.end}
        />
      </SectionCard>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <SectionCard title="Entrou no caixa" description="Total vendido em serviços no período.">
          <p className="text-3xl font-semibold text-white">
            {formatCurrency(data.summary.grossRevenue)}
          </p>
        </SectionCard>

        <SectionCard title="A pagar aos barbeiros" description="Soma dos repasses do período.">
          <p className="text-3xl font-semibold text-amber-300">
            {formatCurrency(data.summary.commissionTotal)}
          </p>
        </SectionCard>

        <SectionCard title="Fica para a barbearia" description="Valor da casa depois dos repasses.">
          <p className="text-3xl font-semibold text-emerald-300">
            {formatCurrency(data.summary.shopNetRevenue)}
          </p>
        </SectionCard>

        <SectionCard title="Atendimentos feitos" description="Serviços concluídos no período.">
          <p className="text-3xl font-semibold text-white">
            {data.summary.appointmentsCount}
          </p>
        </SectionCard>
      </div>

      <div className="mt-8 grid gap-8">
        <SectionCard
          title="Comparar periodos"
          description={`Comparando com ${new Date(
            `${data.comparison.previousRange.start}T00:00:00`
          ).toLocaleDateString("pt-BR")} até ${new Date(
            `${data.comparison.previousRange.end}T00:00:00`
          ).toLocaleDateString("pt-BR")}.`}
        >
          <ComparisonControls
            period={data.filters.period}
            start={data.filters.start}
            end={data.filters.end}
            historyStart={data.filters.historyStart}
            historyEnd={data.filters.historyEnd}
            compareMode={data.filters.compareMode as "auto" | "custom"}
            compareStart={data.filters.compareStart}
            compareEnd={data.filters.compareEnd}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-sm text-zinc-400">Total faturado</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                Período atual
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {formatCurrency(data.comparison.current.grossRevenue)}
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Período anterior: {formatCurrency(data.comparison.previous.grossRevenue)}
              </p>
              <p className={`mt-1 text-sm ${getDeltaTone(
                data.comparison.current.grossRevenue,
                data.comparison.previous.grossRevenue
              )}`}>
                Diferenca: {formatDelta(
                  data.comparison.current.grossRevenue,
                  data.comparison.previous.grossRevenue
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-sm text-zinc-400">Fica para a barbearia</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                Período atual
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">
                {formatCurrency(data.comparison.current.shopNetRevenue)}
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Período anterior: {formatCurrency(data.comparison.previous.shopNetRevenue)}
              </p>
              <p className={`mt-1 text-sm ${getDeltaTone(
                data.comparison.current.shopNetRevenue,
                data.comparison.previous.shopNetRevenue
              )}`}>
                Diferenca: {formatDelta(
                  data.comparison.current.shopNetRevenue,
                  data.comparison.previous.shopNetRevenue
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-sm text-zinc-400">A pagar aos barbeiros</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                Período atual
              </p>
              <p className="mt-1 text-2xl font-semibold text-amber-300">
                {formatCurrency(data.comparison.current.commissionTotal)}
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Período anterior: {formatCurrency(data.comparison.previous.commissionTotal)}
              </p>
              <p className={`mt-1 text-sm ${getDeltaTone(
                data.comparison.current.commissionTotal,
                data.comparison.previous.commissionTotal
              )}`}>
                Diferenca: {formatDelta(
                  data.comparison.current.commissionTotal,
                  data.comparison.previous.commissionTotal
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-sm text-zinc-400">Atendimentos feitos</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                Período atual
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {data.comparison.current.appointmentsCount}
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Período anterior: {data.comparison.previous.appointmentsCount}
              </p>
              <p className={`mt-1 text-sm ${getDeltaTone(
                data.comparison.current.appointmentsCount,
                data.comparison.previous.appointmentsCount
              )}`}>
                Diferenca: {formatDelta(
                  data.comparison.current.appointmentsCount,
                  data.comparison.previous.appointmentsCount,
                  "number"
                )}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-8 grid gap-8">
        <SectionCard
          title="Resumo rápido"
          description="Principais pontos do período: ticket médio, melhor dia e movimento."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                Valor médio por atendimento
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {formatCurrency(data.summary.averageTicket)}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Media de quanto cada atendimento gerou.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                Melhor dia do período
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {data.analytics.topDay?.label || "--"}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {data.analytics.topDay
                  ? `${formatCurrency(data.analytics.topDay.grossRevenue)} em serviços`
                  : "Sem dados suficientes"}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                Dia mais cheio
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {data.analytics.busiestDay?.label || "--"}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {data.analytics.busiestDay
                  ? `${data.analytics.busiestDay.appointmentsCount} atendimentos`
                  : "Sem atendimentos no período"}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                Melhor dia da semana
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {data.analytics.weekdayPerformance[0]?.label || "--"}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {data.analytics.weekdayPerformance[0]
                  ? `${formatCurrency(data.analytics.weekdayPerformance[0].grossRevenue)} acumulados`
                  : "Sem histórico no filtro"}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-8 grid gap-8">
        <SectionCard
          title="Movimento por dia"
          description="Veja em quais dias entrou mais dinheiro e quantos atendimentos foram feitos."
        >
          {data.analytics.dailySeries.length === 0 ? (
            <EmptyState
              title="Sem movimento no período"
              description="Quando houver atendimentos concluídos, a série diária aparecerá aqui."
            />
          ) : (
            <div className="space-y-4">
              {data.analytics.dailySeries.map((day) => (
                <div key={day.date} className="grid gap-2 md:grid-cols-[88px_1fr_auto] md:items-center">
                  <div>
                    <p className="text-sm font-medium text-white">{day.label}</p>
                    <p className="text-xs text-zinc-500">
                      {day.appointmentsCount} atendimento(s)
                    </p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300"
                      style={{
                        width: `${Math.max(
                          10,
                          (day.grossRevenue / maxDailyRevenue) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {formatCurrency(day.grossRevenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-8 grid gap-8">
        <SectionCard
          title="Valores por barbeiro"
          description="Compare quanto cada profissional vendeu, quanto recebe e quanto fica para a barbearia."
        >
          {data.analytics.barberInsights.length === 0 ? (
            <EmptyState
              title="Sem comparativo por barbeiro"
              description="O gráfico aparece quando houver faturamento no período."
            />
          ) : (
            <div className="space-y-5">
              {data.analytics.barberInsights.map((barber) => (
                <div key={barber.barberId} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-white">{barber.barberName}</p>
                    <p className="text-sm text-zinc-400">
                      {barber.appointmentsCount} atendimento(s)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <MetricBar
                      label="Total vendido"
                      value={barber.grossRevenue}
                      color="bg-sky-400"
                      maxValue={maxBarberRevenue}
                    />
                    <MetricBar
                      label="Repasse"
                      value={barber.commissionTotal}
                      color="bg-amber-400"
                      maxValue={maxBarberRevenue}
                    />
                    <MetricBar
                      label="Barbearia"
                      value={barber.shopNetRevenue}
                      color="bg-emerald-400"
                      maxValue={maxBarberRevenue}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Serviços que mais venderam"
          description="Lista dos serviços que mais geraram dinheiro no período."
        >
          {data.analytics.topServices.length === 0 ? (
            <EmptyState
              title="Sem serviços no período"
              description="Os serviços mais vendidos aparecerão aqui quando houver faturamento."
            />
          ) : (
            <div className="space-y-3">
              {data.analytics.topServices.slice(0, 5).map((service) => (
                <div key={service.label} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{service.label}</p>
                    <p className="text-sm text-zinc-400">{service.count} vezes</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{
                        width: `${Math.max(
                          12,
                          (service.grossRevenue / maxServiceRevenue) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-emerald-300">
                    {formatCurrency(service.grossRevenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Gerar repasse dos barbeiros"
        description="Confira os valores do período e salve o fechamento para cada barbeiro."
        className="mt-8"
        actions={
          <GeneratePayoutsButton
            filters={{
              period: data.filters.period,
              start: data.filters.start,
              end: data.filters.end,
              historyStart: data.filters.historyStart,
              historyEnd: data.filters.historyEnd,
              compareMode: data.filters.compareMode,
              compareStart: data.filters.compareStart,
              compareEnd: data.filters.compareEnd,
            }}
          />
        }
      >
        {data.barberPayouts.length === 0 ? (
          <EmptyState
            title="Nenhum fechamento para mostrar"
            description="Conclua atendimentos no período escolhido para gerar os repasses."
          />
        ) : (
          <div className="space-y-4">
            {data.barberPayouts.map((item) => (
              <div
                key={item.barberId}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-white">{item.barberName}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {item.appointmentsCount} atendimentos concluídos no período
                    </p>
                    <div className="mt-3">
                      <StatusBadge
                        variant={
                          item.savedStatus === "PAID"
                            ? "success"
                            : item.savedStatus === "CLOSED"
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {item.savedStatus === "PAID"
                          ? "Pago"
                          : item.savedStatus === "CLOSED"
                          ? "Fechado"
                          : "Aberto"}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="grid gap-1 text-right text-sm">
                    <p className="text-zinc-400">Total vendido: {formatCurrency(item.grossRevenue)}</p>
                    <p className="text-amber-300">
                      A pagar: {formatCurrency(item.commissionTotal)}
                    </p>
                    <p className="text-emerald-300">
                      Fica para a barbearia: {formatCurrency(item.shopNetRevenue)}
                    </p>
                    {item.savedPaidAt && (
                      <p className="text-xs text-zinc-500">
                        Pago em {new Date(item.savedPaidAt).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>

                {item.savedPayoutId && (
                  <div className="mt-4">
                    <PayoutActionPanel
                      payoutId={item.savedPayoutId}
                      status={item.savedStatus || "OPEN"}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Fechamentos salvos"
        description="últimos repasses gerados e pagos para consulta rápida."
        className="mt-8"
        actions={
          <FinanceHistoryFilters
            historyStart={data.filters.historyStart}
            historyEnd={data.filters.historyEnd}
          />
        }
      >
        {data.history.length === 0 ? (
          <EmptyState
            title="Sem histórico ainda"
            description="Os fechamentos realizados aparecerão aqui."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
                  <th className="px-4 py-3">Barbeiro</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Total vendido</th>
                  <th className="px-4 py-3">Repasse</th>
                  <th className="px-4 py-3">Barbearia</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Pago em</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-800 text-sm">
                    <td className="px-4 py-3">{item.barber.name || "Barbeiro"}</td>
                    <td className="px-4 py-3">
                      {new Date(item.periodStart).toLocaleDateString("pt-BR")} até{" "}
                      {new Date(item.periodEnd).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(item.grossRevenue)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.commissionTotal)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.shopNetRevenue)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        variant={
                          item.status === "PAID"
                            ? "success"
                            : item.status === "CLOSED"
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {item.status === "PAID"
                          ? "Pago"
                          : item.status === "CLOSED"
                          ? "Fechado"
                          : "Aberto"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {item.paidAt
                        ? new Date(item.paidAt).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <PayoutActionPanel
                        payoutId={item.id}
                        status={item.status}
                        showDelete
                        size="sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function MetricBar({
  label,
  value,
  color,
  maxValue,
}: {
  label: string;
  value: number;
  color: string;
  maxValue: number;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[88px_1fr_auto] md:items-center">
      <p className="text-sm text-zinc-300">{label}</p>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{
            width: `${Math.max(10, (value / Math.max(maxValue, 1)) * 100)}%`,
          }}
        />
      </div>
      <p className="text-sm font-semibold text-white">{formatCurrency(value)}</p>
    </div>
  );
}
