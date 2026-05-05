import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
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
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <PageHeader
        title="Pedidos"
        description="Acompanhe os pedidos da loja, atualize status e registre rastreios."
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

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <SectionCard title="Pedidos" description="Total dentro do filtro atual.">
          <p className="text-3xl font-semibold text-white">{summary.total}</p>
        </SectionCard>

        <SectionCard
          title="Receita"
          description="Valor total sem considerar pedidos cancelados."
        >
          <p className="text-3xl font-semibold text-emerald-300">
            {summary.revenue.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </SectionCard>

        <SectionCard
          title="Pendentes"
          description="Pedidos aguardando confirmação."
        >
          <p className="text-3xl font-semibold text-amber-300">
            {summary.pending}
          </p>
        </SectionCard>

        <SectionCard
          title="Atendidos"
          description="Pedidos enviados ou entregues."
        >
          <p className="text-3xl font-semibold text-sky-300">
            {summary.fulfilled}
          </p>
        </SectionCard>
      </div>

      <div className="mt-6 space-y-4">
        {orders.length === 0 ? (
          <EmptyState
            title="Nenhum pedido encontrado"
            description="Os novos pedidos da loja aparecerão aqui automaticamente."
          />
        ) : (
          <>
            <div className="flex justify-end">
              <Link
                href={
                  exportParams
                    ? `/admin/pedidos/export?${exportParams}`
                    : "/admin/pedidos/export"
                }
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
              >
                Exportar CSV
              </Link>
            </div>

            {orders.map((order) => (
              <SectionCard
                key={order.id}
                title={order.customer.name || order.customer.email || "Cliente sem nome"}
                description={`Total do pedido: R$ ${order.total.toFixed(2)}`}
              >
              <div className="flex flex-wrap justify-between gap-4">
                <div className="space-y-2">
                  <div>
                    <StatusBadge variant={orderStatusVariant[order.status] || "neutral"}>
                      {orderStatusLabel[order.status]}
                    </StatusBadge>
                  </div>
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

              <div className="mt-4">
                {order.items.map((item) => (
                  <p key={item.id}>
                    {item.productNameSnapshot} x{item.quantity}
                  </p>
                ))}
              </div>
              </SectionCard>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
