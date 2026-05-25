import Link from "next/link";
import { basePrisma } from "@/lib/prisma-core";
import { isWrTenantCreationEnabled, requireWrAdminSession } from "@/lib/wrSession";
import WrShell from "./WrShell";

export const dynamic = "force-dynamic";

export default async function WrDashboardPage() {
  const [{ user }, tenantCount, activeTenantCount, creationEnabled] =
    await Promise.all([
      requireWrAdminSession(),
      basePrisma.shop.count(),
      basePrisma.shop.count({ where: { isActive: true } }),
      isWrTenantCreationEnabled(),
    ]);

  return (
    <WrShell userName={user.name}>
      <section className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
            Plataforma WR
          </p>
          <h1 className="mt-3 text-3xl font-black">Controle de barbearias</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Gerencie tenants, dominios e administradores iniciais sem entrar no
            painel operacional de cada barbearia.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/wr/tenants"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
            >
              Ver barbearias
            </Link>
            <Link
              href="/wr/tenants/novo"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white hover:border-cyan-300/60"
            >
              Criar barbearia
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-slate-400">Barbearias cadastradas</p>
            <strong className="mt-2 block text-4xl font-black">{tenantCount}</strong>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-slate-400">Ativas</p>
            <strong className="mt-2 block text-4xl font-black">{activeTenantCount}</strong>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-slate-400">Criacao em producao</p>
            <strong className="mt-2 block text-lg font-black">
              {creationEnabled ? "Liberada" : "Bloqueada"}
            </strong>
          </div>
        </div>
      </section>
    </WrShell>
  );
}
