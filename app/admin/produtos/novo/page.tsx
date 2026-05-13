import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BackLink from "@/components/ui/BackLink";
import DashboardShell from "@/components/ui/DashboardShell";
import NewProductForm from "./NewProductForm";

export default async function NovoProduto() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/painel");

  return (
    <DashboardShell size="narrow">
      <section className="dashboard-panel p-4 sm:p-6">
        <div className="mb-5">
          <BackLink href="/admin/produtos" area="Produtos" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
            Painel admin
          </p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            Novo produto
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Cadastre um item visual do catálogo com imagem e preço.
          </p>
        </div>

        <NewProductForm />
      </section>
    </DashboardShell>
  );
}
