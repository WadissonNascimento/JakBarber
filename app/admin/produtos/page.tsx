import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import { normalizeProductImageUrl } from "@/lib/productImageUrl";
import ProductCardClient from "./ProductCardClient";

export default async function ProdutosPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/painel");

  const products = await prisma.product.findMany({
    include: {
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const lowStockProducts = products.filter((product) => product.stock <= 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 text-white">
      <PageHeader
        title="Produtos"
        description="Catélogo, estoque e reposição do Arsenal."
        actions={
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              Voltar
            </Link>
            <Link
              href="/admin/produtos/novo"
              className="rounded-xl bg-green-600 px-4 py-2"
            >
              Novo produto
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SectionCard title="Produtos ativos" description="Itens visíveis no catélogo.">
          <p className="text-3xl font-semibold text-white">
            {products.filter((product) => product.isActive).length}
          </p>
        </SectionCard>

        <SectionCard title="Estoque baixo" description="Produtos com 3 unidades ou menos.">
          <p className="text-3xl font-semibold text-amber-300">
            {lowStockProducts.length}
          </p>
        </SectionCard>

        <SectionCard title="Sem estoque" description="Itens indisponíveis no momento.">
          <p className="text-3xl font-semibold text-rose-300">
            {products.filter((product) => product.stock === 0).length}
          </p>
        </SectionCard>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="Nenhum produto cadastrado"
          description="Adicione o primeiro produto para iniciar o Arsenal."
          actionLabel="Novo produto"
          actionHref="/admin/produtos/novo"
        />
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const imageUrl = normalizeProductImageUrl(product.imageUrl);

            return (
              <div
                key={product.id}
                className="space-y-2"
              >
                <SectionCard
                  title={product.name}
                  description={`Preco atual: R$ ${product.price.toFixed(2)}`}
                >
                  <ProductCardClient
                    product={{
                      id: product.id,
                      name: product.name,
                      description: product.description,
                      category: product.category,
                      price: product.price,
                      isActive: product.isActive,
                      stock: product.stock,
                      imageUrl,
                      stockMovements: product.stockMovements,
                    }}
                  />
                </SectionCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
