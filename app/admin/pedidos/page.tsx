import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BackLink from "@/components/ui/BackLink";
import DashboardShell from "@/components/ui/DashboardShell";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import SummaryStatsPanel from "@/components/ui/SummaryStatsPanel";
import {
  ADMIN_ORDER_STATUSES,
  getAdminOrdersReport,
} from "@/lib/adminReports";
import { orderStatusLabel, orderStatusVariant } from "@/lib/orderStatus";
import OrderActionPanel from "./OrderActionPanel";
import OrdersFilters from "./OrdersFilters";

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams?: {
    feedback?: string;
    tone?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  };
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/painel");

  const dateFrom = searchParams?.dateFrom || "";
  const dateTo = searchParams?.dateTo || "";
  const status = searchParams?.status || "";
  const filters = { dateFrom, dateTo, status };
  const { orders, summary } = await getAdminOrdersReport(filters);
  const exportParams = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => Boolean(value))
  ).toString();

  return (
    <DashboardShell>
      <PageHeader
        title="Pedidos"
        description="Acompanhe os pedidos da loja, atualize status e registre rastreios."
        actions={<BackLink href="/admin" area="Admin" />}
      />

      <SectionCard
        title="Filtros"
        description="Refine os pedidos por período e status antes de exportar."
        className="mt-6"
      >
        <OrdersFilters
          dateFrom={dateFrom}
          dateTo={dateTo}
          status={status}
          statusOptions={ADMIN_ORDER_STATUSES.map((orderStatus) => ({
            value: orderStatus,
            label: orderStatusLabel[orderStatus],
          }))}
        />
      </SectionCard>

      <SummaryStatsPanel
        className="mt-6"
        title="Resumo dos pedidos"
        description="Total, receita e status dentro do filtro atual."
        stats={[
          {
            label: "Pedidos",
            value: summary.total,
            helper: "Total dentro do filtro atual",
          },
          {
            label: "Receita",
            value: summary.revenue.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            }),
            helper: "Sem considerar pedidos cancelados",
            tone: "success",
          },
          {
            label: "Pendentes",
            value: summary.pending,
            helper: "Pedidos aguardando confirmação",
            tone: "warning",
          },
          {
            label: "Atendidos",
            value: summary.fulfilled,
            helper: "Pedidos enviados ou entregues",
            tone: "info",
          },
        ]}
      />

      <div className="mt-6 space-y-4">
        {orders.length === 0 ? (
          <EmptyState
            title="Nenhum pedido encontrado"
            description="Os novos pedidos da loja aparecerão aqui automaticamente."
          />
        ) : (
          <SectionCard
            title="Lista de pedidos"
            description="Pedidos encontrados no filtro atual, com status e rastreio."
            actions={
              <Link
                href={
                  exportParams
                    ? `/admin/pedidos/export?${exportParams}`
                    : "/admin/pedidos/export"
                }
                className="btn-secondary"
              >
                Exportar CSV
              </Link>
            }
          >
            <div className="space-y-3">
              {orders.map((order) => (
                <article key={order.id} className="dashboard-subpanel p-4 sm:p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {order.customer.name || order.customer.email || "Cliente sem nome"}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        Total do pedido: R$ {order.total.toFixed(2)}
                      </p>
                    </div>
                    <StatusBadge variant={orderStatusVariant[order.status] || "neutral"}>
                      {orderStatusLabel[order.status]}
                    </StatusBadge>
                  </div>
                  <div className="flex flex-wrap justify-between gap-4">
                    <div className="space-y-2 text-sm text-zinc-300">
                  <p>
                    <b>Endereco:</b> {order.shippingAddress || "Não informado"}
                  </p>
                  <p>
                    <b>CEP:</b> {order.shippingZipCode || "Não informado"}
                  </p>
                  <p>
                    <b>Frete:</b> {order.shippingMethod || "Não informado"} - R$ {order.shippingCost.toFixed(2)}
                  </p>
                  <p>
                    <b>Subtotal:</b> R$ {order.subtotal.toFixed(2)}
                  </p>
                  <p>
                    <b>Desconto:</b> R$ {order.discountTotal.toFixed(2)}
                  </p>
                  <p>
                    <b>Cupom:</b> {order.coupon?.code || "Nenhum"}
                  </p>
                  <p>
                    <b>Rastreio:</b> {order.trackingCode || "Não informado"}
                  </p>
                    </div>

                    <OrderActionPanel
                      orderId={order.id}
                      status={order.status}
                      trackingCode={order.trackingCode}
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
                    {order.items.map((item) => (
                      <p key={item.id}>
                        {item.productNameSnapshot} x{item.quantity}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </DashboardShell>
  );
}
