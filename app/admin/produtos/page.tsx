import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BackLink from "@/components/ui/BackLink";
import DashboardShell from "@/components/ui/DashboardShell";
import EmptyState from "@/components/ui/EmptyState";
import SummaryStatsPanel from "@/components/ui/SummaryStatsPanel";
import { normalizeProductImageUrl } from "@/lib/productImageUrl";
import { toMoneyNumber } from "@/lib/money";
import ProductCardClient from "./ProductCardClient";

export default async function ProdutosPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/painel");

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  const activeProducts = products.filter((product) => product.isActive).length;
  const hiddenProducts = products.length - activeProducts;

  return (
    <DashboardShell size="wide">
      <section className="dashboard-panel p-4 sm:p-6">
        <div className="mb-5">
          <BackLink href="/admin" area="Admin" />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
              Painel admin
            </p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Produtos
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Catálogo, imagens, preços e visibilidade dos itens vendidos.
            </p>
          </div>

          <Link href="/admin/produtos/novo" className="btn-primary w-full sm:w-auto">
            Novo produto
          </Link>
        </div>

        <SummaryStatsPanel
          className="my-5"
          title="Resumo do catálogo"
          description="Leitura rápida antes de editar os produtos."
          stats={[
            {
              label: "Produtos ativos",
              value: activeProducts,
              helper: "Visíveis no catálogo",
            },
            {
              label: "Produtos ocultos",
              value: hiddenProducts,
              helper: "Fora do catálogo",
              tone: hiddenProducts > 0 ? "warning" : undefined,
            },
            {
              label: "Total",
              value: products.length,
              helper: "Itens cadastrados",
            },
          ]}
        />

        <div className="border-t border-white/10 pt-5">
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-strong)]">
              Catálogo
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              Lista de produtos
            </h2>
          </div>

          {products.length === 0 ? (
            <EmptyState
              title="Nenhum produto cadastrado"
              description="Adicione o primeiro produto para iniciar o catálogo."
              actionLabel="Novo produto"
              actionHref="/admin/produtos/novo"
            />
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <ProductCardClient
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    price: toMoneyNumber(product.price),
                    isActive: product.isActive,
                    imageUrl: normalizeProductImageUrl(product.imageUrl),
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
