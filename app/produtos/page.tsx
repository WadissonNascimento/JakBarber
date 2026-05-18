import { unstable_cache } from "next/cache";
import { basePrisma } from "@/lib/prisma-core";
import DashboardShell from "@/components/ui/DashboardShell";
import EmptyState from "@/components/ui/EmptyState";
import { ProductGrid } from "@/components/ProductGrid";
import { getCurrentShop } from "@/lib/shop";
import { toMoneyNumber } from "@/lib/money";

export const metadata = {
  title: "Arsenal do barbeiro",
  description: "Produtos selecionados para rotina, bancada e revenda.",
};

const getPublicProducts = unstable_cache(
  async (shopId: string) =>
    basePrisma.product.findMany({
      where: {
        shopId,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        secondaryImages: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            url: true,
          },
        },
      },
    }),
  ["public-products"],
  {
    revalidate: 300,
  }
);

export default async function ProdutosPage() {
  const shop = await getCurrentShop();
  const products = await getPublicProducts(shop.id);

  return (
    <main className="min-h-screen text-white">
      <DashboardShell>
        <section className="dashboard-panel p-4 sm:p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-strong)]">
            Cliente
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Arsenal do barbeiro
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Produtos selecionados para rotina, bancada e revenda.
          </p>
        </section>

        <section className="mt-5">
          {products.length === 0 ? (
            <EmptyState
              title="Nenhum produto no catalogo"
              description="Quando houver produtos ativos no catalogo, eles aparecem aqui."
            />
          ) : (
            <ProductGrid
              products={products.map((product) => ({
                ...product,
                price: toMoneyNumber(product.price),
              }))}
              whatsappNumber={shop.whatsappNumber || ""}
            />
          )}
        </section>
      </DashboardShell>
    </main>
  );
}
