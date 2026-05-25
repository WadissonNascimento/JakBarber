import Link from "next/link";
import { getDomainReadiness } from "@/lib/domainReadiness";
import { basePrisma } from "@/lib/prisma-core";
import { isWrTenantCreationEnabled, requireWrAdminSession } from "@/lib/wrSession";
import WrShell from "../WrShell";

export const dynamic = "force-dynamic";

export default async function WrTenantsPage() {
  const [{ user }, shops, creationEnabled] = await Promise.all([
    requireWrAdminSession(),
    basePrisma.shop.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        primaryDomain: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            services: true,
            appointments: true,
          },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
    isWrTenantCreationEnabled(),
  ]);
  const shopsWithDomainStatus = await Promise.all(
    shops.map(async (shop) => ({
      ...shop,
      domainReadiness: await getDomainReadiness(shop.primaryDomain),
    }))
  );

  return (
    <WrShell userName={user.name}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
            Tenants
          </p>
          <h1 className="mt-2 text-3xl font-black">Barbearias</h1>
        </div>
        <Link
          href="/wr/tenants/novo"
          className={`rounded-xl px-5 py-3 text-sm font-black ${
            creationEnabled
              ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              : "border border-white/10 text-slate-300"
          }`}
        >
          Nova barbearia
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
        <div className="grid gap-0 divide-y divide-white/10">
          {shopsWithDomainStatus.map((shop) => (
            <article
              key={shop.id}
              className="grid gap-4 p-5 md:grid-cols-[1.2fr_1fr_0.8fr]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black">{shop.name}</h2>
                  {shop.isDefault ? (
                    <span className="rounded-full bg-cyan-400/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
                      Padrao
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                      shop.isActive
                        ? "bg-emerald-400/15 text-emerald-200"
                        : "bg-red-400/15 text-red-200"
                    }`}
                  >
                    {shop.isActive ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{shop.id}</p>
              </div>

              <div className="text-sm text-slate-300">
                <p>Slug: {shop.slug}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span>Dominio: {shop.primaryDomain || "nao configurado"}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                      shop.domainReadiness.tone === "success"
                        ? "bg-emerald-400/15 text-emerald-200"
                        : shop.domainReadiness.tone === "danger"
                          ? "bg-red-400/15 text-red-200"
                          : shop.domainReadiness.tone === "warning"
                            ? "bg-amber-400/15 text-amber-200"
                            : "bg-white/10 text-slate-300"
                    }`}
                    title={shop.domainReadiness.message}
                  >
                    {shop.domainReadiness.label}
                  </span>
                </div>
                {shop.domainReadiness.status === "wrong_target" ? (
                  <p className="mt-1 text-xs text-amber-200">
                    IP atual: {shop.domainReadiness.resolvedIpv4s.join(", ") || "nenhum"}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
                <div className="rounded-xl bg-black/20 p-3">
                  <strong className="block text-lg text-white">{shop._count.users}</strong>
                  usuarios
                </div>
                <div className="rounded-xl bg-black/20 p-3">
                  <strong className="block text-lg text-white">{shop._count.services}</strong>
                  servicos
                </div>
                <div className="rounded-xl bg-black/20 p-3">
                  <strong className="block text-lg text-white">
                    {shop._count.appointments}
                  </strong>
                  agendas
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </WrShell>
  );
}
