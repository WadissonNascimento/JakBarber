import Link from "next/link";
import {
  getDomainActivationStatus,
  isWrDomainActivationEnabled,
} from "@/lib/domainActivation";
import { getDomainReadiness } from "@/lib/domainReadiness";
import { basePrisma } from "@/lib/prisma-core";
import { getTenantPlan, TENANT_PLANS } from "@/lib/tenantPlans";
import { isWrTenantCreationEnabled, requireWrAdminSession } from "@/lib/wrSession";
import WrShell from "../WrShell";
import {
  archiveTenantAction,
  reactivateTenantAction,
  updateTenantPlanAction,
} from "./actions";

export const dynamic = "force-dynamic";

type WrTenantsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getFlashParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: "notice" | "error",
) {
  const value = params?.[key];

  return typeof value === "string" ? value : null;
}

function statusBadgeClass(tone: "muted" | "warning" | "success" | "danger") {
  if (tone === "success") {
    return "bg-emerald-400/15 text-emerald-200";
  }

  if (tone === "danger") {
    return "bg-red-400/15 text-red-200";
  }

  if (tone === "warning") {
    return "bg-amber-400/15 text-amber-200";
  }

  return "bg-white/10 text-slate-300";
}

export default async function WrTenantsPage({ searchParams }: WrTenantsPageProps) {
  const [{ user }, shops, creationEnabled, activationEnabled, params] = await Promise.all([
    requireWrAdminSession(),
    basePrisma.shop.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        primaryDomain: true,
        isActive: true,
        isDefault: true,
        archivedAt: true,
        planCode: true,
        barberLimit: true,
        logoPath: true,
        brandColor: true,
        designTemplate: true,
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
    isWrDomainActivationEnabled(),
    searchParams,
  ]);
  const notice = getFlashParam(params, "notice");
  const error = getFlashParam(params, "error");
  const shopsWithDomainStatus = await Promise.all(
    shops.map(async (shop) => {
      const domainReadiness = await getDomainReadiness(shop.primaryDomain);
      const [activeBarbers, pendingBarbers] = await Promise.all([
        basePrisma.user.count({
          where: {
            shopId: shop.id,
            role: "BARBER",
            isActive: true,
          },
        }),
        basePrisma.pendingRegistration.count({
          where: {
            shopId: shop.id,
            role: "BARBER",
            expiresAt: {
              gt: new Date(),
            },
          },
        }),
      ]);

      return {
        ...shop,
        activeBarbers,
        pendingBarbers,
        domainReadiness,
        domainActivation: await getDomainActivationStatus(shop.primaryDomain, domainReadiness),
      };
    })
  );

  return (
    <WrShell userName={user.name}>
      <div className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
            Tenants
          </p>
          <h1 className="mt-2 text-4xl font-black">Barbearias</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Controle operação, design, domínio e limite de equipe de cada tenant.
          </p>
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
      </div>

      {notice ? (
        <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-100">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] shadow-[0_28px_100px_rgba(0,0,0,0.32)]">
        <div className="grid gap-0 divide-y divide-white/10">
          {shopsWithDomainStatus.map((shop) => (
            <article
              key={shop.id}
              className="grid gap-5 p-5 transition hover:bg-white/[0.035] xl:grid-cols-[1.1fr_1fr_0.75fr_1fr]"
            >
              <div>
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-cover bg-center bg-no-repeat text-sm font-black text-white shadow-[0_12px_35px_rgba(0,0,0,0.22)]"
                    style={
                      shop.logoPath
                        ? { backgroundImage: `url(${shop.logoPath})` }
                        : { backgroundColor: shop.brandColor || "#14b8a6" }
                    }
                  >
                    {shop.logoPath ? <span className="sr-only">{shop.name}</span> : shop.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/wr/tenants/${shop.id}`}
                        className="text-lg font-black text-white hover:text-cyan-200"
                      >
                        {shop.name}
                      </Link>
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
                      {shop.archivedAt ? (
                        <span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">
                          Arquivada
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 break-all text-sm text-slate-400">{shop.id}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-600">
                      {shop.designTemplate || "dark-premium"}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/wr/tenants/${shop.id}`}
                  className="mt-4 inline-flex rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-black text-slate-100 hover:border-cyan-300/60"
                >
                  Gerenciar
                </Link>
              </div>

              <div className="text-sm text-slate-300">
                <p>Slug: {shop.slug}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span>Dominio: {shop.primaryDomain || "nao configurado"}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusBadgeClass(shop.domainReadiness.tone)}`}
                    title={shop.domainReadiness.message}
                  >
                    {shop.domainReadiness.label}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusBadgeClass(shop.domainActivation.tone)}`}
                    title={shop.domainActivation.message}
                  >
                    {shop.domainActivation.label}
                  </span>
                </div>
                {shop.domainReadiness.status === "wrong_target" ? (
                  <p className="mt-1 text-xs text-amber-200">
                    IP atual: {shop.domainReadiness.resolvedIpv4s.join(", ") || "nenhum"}
                  </p>
                ) : null}
                {shop.domainActivation.canActivate ? (
                  <form
                    action={`/wr/tenants/${shop.id}/domain/activate`}
                    method="post"
                    className="mt-3"
                  >
                    <button
                      type="submit"
                      disabled={!activationEnabled}
                      className={`rounded-lg px-3 py-2 text-xs font-black ${
                        activationEnabled
                          ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                          : "border border-white/10 text-slate-500"
                      }`}
                      title={
                        activationEnabled
                          ? shop.domainActivation.message
                          : "Ativacao via painel bloqueada neste ambiente."
                      }
                    >
                      Ativar SSL
                    </button>
                  </form>
                ) : null}
                {!shop.isDefault ? (
                  <Link
                    href={`/wr/tenants/${shop.id}`}
                    className="mt-3 inline-flex rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-slate-100 hover:border-cyan-300/60"
                  >
                    Editar site
                  </Link>
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

              <div className="grid gap-3 text-sm">
                <form action={updateTenantPlanAction} className="grid gap-2">
                  <input type="hidden" name="shopId" value={shop.id} />
                  <input type="hidden" name="returnTo" value="list" />
                  <label className="grid gap-1 text-xs font-bold text-slate-300">
                    Plano e barbeiros
                    <div className="grid grid-cols-[1fr_0.6fr_auto] gap-2">
                      <select
                        name="planCode"
                        defaultValue={getTenantPlan(shop.planCode).code}
                        disabled={shop.isDefault}
                        className="min-h-9 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none disabled:opacity-50"
                      >
                        {TENANT_PLANS.map((plan) => (
                          <option key={plan.code} value={plan.code}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                      <input
                        name="barberLimit"
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        defaultValue={shop.barberLimit ?? ""}
                        disabled={shop.isDefault}
                        placeholder="Ilimitado"
                        className="min-h-9 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={shop.isDefault}
                        className="rounded-lg border border-white/10 px-3 text-xs font-black text-slate-100 disabled:opacity-50"
                      >
                        Salvar
                      </button>
                    </div>
                  </label>
                  <p className="text-xs text-slate-500">
                    Uso: {shop.activeBarbers + shop.pendingBarbers}
                    {shop.barberLimit === null ? " / ilimitado" : ` / ${shop.barberLimit}`}{" "}
                    ({shop.pendingBarbers} pendente)
                  </p>
                </form>

                {!shop.isDefault ? (
                  <div className="grid gap-2">
                    {shop.isActive ? (
                      <form action={archiveTenantAction}>
                        <input type="hidden" name="shopId" value={shop.id} />
                        <input type="hidden" name="returnTo" value="list" />
                        <button
                          type="submit"
                          className="w-full rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100"
                        >
                          Arquivar
                        </button>
                      </form>
                    ) : (
                      <form action={reactivateTenantAction}>
                        <input type="hidden" name="shopId" value={shop.id} />
                        <input type="hidden" name="returnTo" value="list" />
                        <button
                          type="submit"
                          className="w-full rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100"
                        >
                          Reativar
                        </button>
                      </form>
                    )}

                    <Link
                      href={`/wr/tenants/${shop.id}#perigo`}
                      className="rounded-lg border border-red-300/25 bg-red-300/10 px-3 py-2 text-center text-xs font-black text-red-100"
                    >
                      Excluir
                    </Link>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </WrShell>
  );
}
