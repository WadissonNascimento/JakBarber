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
      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-[0_28px_100px_rgba(0,0,0,0.38)]">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.015))] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
              Plataforma WR
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-5xl">
              Controle premium para todas as barbearias.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Gerencie tenants, dominios, planos, identidade visual e acessos iniciais
              sem entrar no painel operacional de cada barbearia.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/wr/tenants"
                className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_16px_40px_rgba(34,211,238,0.22)] transition hover:bg-cyan-300"
              >
                Ver barbearias
              </Link>
              <Link
                href="/wr/tenants/novo"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/60"
              >
                Criar barbearia
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
            <p className="text-sm text-slate-400">Barbearias cadastradas</p>
            <strong className="mt-2 block text-4xl font-black">{tenantCount}</strong>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
            <p className="text-sm text-slate-400">Ativas</p>
            <strong className="mt-2 block text-4xl font-black">{activeTenantCount}</strong>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
            <p className="text-sm text-slate-400">Criacao em producao</p>
            <strong className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-black ${
              creationEnabled
                ? "bg-emerald-400/15 text-emerald-100"
                : "bg-amber-400/15 text-amber-100"
            }`}>
              {creationEnabled ? "Liberada" : "Bloqueada"}
            </strong>
          </div>
        </div>
      </section>
    </WrShell>
  );
}
