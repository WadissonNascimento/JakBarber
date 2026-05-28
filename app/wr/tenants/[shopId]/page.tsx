import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDomainActivationStatus,
  isWrDomainActivationEnabled,
} from "@/lib/domainActivation";
import { getDomainReadiness } from "@/lib/domainReadiness";
import { basePrisma } from "@/lib/prisma-core";
import {
  TENANT_DESIGN_TEMPLATES,
  TENANT_FONT_STYLES,
  getTenantDesignTemplate,
  getTenantFontStyle,
} from "@/lib/tenantDesign";
import { getTenantPlan, TENANT_PLANS } from "@/lib/tenantPlans";
import { requireWrAdminSession } from "@/lib/wrSession";
import WrShell from "../../WrShell";
import {
  archiveTenantAction,
  deleteTenantAction,
  reactivateTenantAction,
  updateTenantDesignAction,
  updateTenantHomeContentAction,
  updateTenantPlanAction,
} from "../actions";

export const dynamic = "force-dynamic";

type TenantDetailPageProps = {
  params: Promise<{ shopId: string }>;
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
  if (tone === "success") return "bg-emerald-400/15 text-emerald-200";
  if (tone === "danger") return "bg-red-400/15 text-red-200";
  if (tone === "warning") return "bg-amber-400/15 text-amber-200";
  return "bg-white/10 text-slate-300";
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-black/20 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <strong className="mt-2 block text-xl text-white">{value}</strong>
    </div>
  );
}

export default async function TenantDetailPage({
  params,
  searchParams,
}: TenantDetailPageProps) {
  const [{ user }, { shopId }, resolvedSearchParams, activationEnabled] =
    await Promise.all([
      requireWrAdminSession(),
      params,
      searchParams,
      isWrDomainActivationEnabled(),
    ]);

  const shop = await basePrisma.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryDomain: true,
      isDefault: true,
      isActive: true,
      archivedAt: true,
      planCode: true,
      barberLimit: true,
      createdAt: true,
      metadataTitle: true,
      metadataDescription: true,
      whatsappNumber: true,
      instagramUrl: true,
      addressLine: true,
      businessHours: true,
      logoPath: true,
      faviconPath: true,
      brandColor: true,
      backgroundColor: true,
      textColor: true,
      fontStyle: true,
      designTemplate: true,
      heroImageUrl: true,
      heroEyebrow: true,
      heroTitle: true,
      heroSubtitle: true,
      primaryCtaLabel: true,
      secondaryCtaLabel: true,
      secondaryCtaHref: true,
      attendanceText: true,
      reviewsTitle: true,
      reviewsEmptyText: true,
      _count: {
        select: {
          users: true,
          services: true,
          appointments: true,
          reviews: true,
        },
      },
    },
  });

  if (!shop) {
    notFound();
  }

  const [
    domainReadiness,
    activeBarbers,
    pendingBarbers,
    admins,
    latestAppointments,
  ] = await Promise.all([
    getDomainReadiness(shop.primaryDomain),
    basePrisma.user.count({
      where: { shopId: shop.id, role: "BARBER", isActive: true },
    }),
    basePrisma.pendingRegistration.count({
      where: {
        shopId: shop.id,
        role: "BARBER",
        expiresAt: { gt: new Date() },
      },
    }),
    basePrisma.user.findMany({
      where: { shopId: shop.id, role: "SHOP_ADMIN" },
      select: { id: true, name: true, email: true, isActive: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    basePrisma.appointment.findMany({
      where: { shopId: shop.id },
      select: { id: true, date: true, status: true },
      orderBy: { date: "desc" },
      take: 5,
    }),
  ]);
  const domainActivation = await getDomainActivationStatus(
    shop.primaryDomain,
    domainReadiness,
  );
  const notice = getFlashParam(resolvedSearchParams, "notice");
  const error = getFlashParam(resolvedSearchParams, "error");
  const plan = getTenantPlan(shop.planCode);
  const designTemplate = getTenantDesignTemplate(shop.designTemplate);
  const fontStyle = getTenantFontStyle(shop.fontStyle);
  const usedBarberSlots = activeBarbers + pendingBarbers;

  return (
    <WrShell userName={user.name}>
      <div className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-cover bg-center bg-no-repeat text-lg font-black text-white shadow-[0_12px_35px_rgba(0,0,0,0.24)]"
            style={
              shop.logoPath
                ? { backgroundImage: `url(${shop.logoPath})` }
                : { backgroundColor: shop.brandColor || designTemplate.brandColor }
            }
          >
            {shop.logoPath ? <span className="sr-only">{shop.name}</span> : shop.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
          <Link href="/wr/tenants" className="text-sm text-cyan-200 hover:underline">
            Voltar para barbearias
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black">{shop.name}</h1>
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
          <p className="mt-2 text-sm text-slate-400">
            {shop.id} - slug {shop.slug}
          </p>
          </div>
        </div>
        {shop.primaryDomain ? (
          <a
            href={`https://${shop.primaryDomain}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:border-cyan-300/60"
          >
            Abrir site
          </a>
        ) : null}
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

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)]">
          <h2 className="text-xl font-black">Resumo</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard label="Usuarios" value={shop._count.users} />
            <InfoCard label="Servicos" value={shop._count.services} />
            <InfoCard label="Agendas" value={shop._count.appointments} />
            <InfoCard label="Avaliacoes" value={shop._count.reviews} />
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <p>Titulo Google: {shop.metadataTitle || "Nao configurado"}</p>
            <p>WhatsApp: {shop.whatsappNumber || "Nao configurado"}</p>
            <p>Endereco: {shop.addressLine || "Nao configurado"}</p>
            <p>Horario: {shop.businessHours || "Nao configurado"}</p>
            <p>Instagram: {shop.instagramUrl || "Nao configurado"}</p>
            <p>Desde: {shop.createdAt.toLocaleDateString("pt-BR")}</p>
          </div>
          {shop.metadataDescription ? (
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {shop.metadataDescription}
            </p>
          ) : null}
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)]">
          <h2 className="text-xl font-black">Plano e limite</h2>
          <form action={updateTenantPlanAction} className="mt-4 grid gap-3">
            <input type="hidden" name="shopId" value={shop.id} />
            <input type="hidden" name="returnTo" value="detail" />
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Plano</span>
              <select
                name="planCode"
                defaultValue={plan.code}
                disabled={shop.isDefault}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none disabled:opacity-50"
              >
                {TENANT_PLANS.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                    {item.barberLimit ? ` - ${item.barberLimit} barbeiros` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">
                Limite manual
              </span>
              <input
                name="barberLimit"
                type="number"
                min="1"
                max="100"
                step="1"
                defaultValue={shop.barberLimit ?? ""}
                disabled={shop.isDefault}
                placeholder="Ilimitado"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none disabled:opacity-50"
              />
            </label>
            <p className="text-sm text-slate-400">
              Uso atual: {usedBarberSlots}
              {shop.barberLimit === null ? " / ilimitado" : ` / ${shop.barberLimit}`}{" "}
              ({pendingBarbers} convite pendente).
            </p>
            <button
              type="submit"
              disabled={shop.isDefault}
              className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              Salvar plano
            </button>
          </form>
        </section>

        <section className="rounded-[1.5rem] border border-cyan-300/15 bg-cyan-300/[0.035] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)]">
          <h2 className="text-xl font-black">Design</h2>
          <form
            action={updateTenantDesignAction}
            encType="multipart/form-data"
            className="mt-4 grid gap-3"
          >
            <input type="hidden" name="shopId" value={shop.id} />
            <div className="grid gap-3 rounded-2xl border border-dashed border-cyan-300/20 bg-black/20 p-4 md:grid-cols-[7rem_1fr]">
              <div
                className="flex aspect-square items-center justify-center rounded-2xl border border-white/10 bg-slate-950 bg-contain bg-center bg-no-repeat text-sm font-black text-white"
                style={
                  shop.logoPath
                    ? { backgroundImage: `url(${shop.logoPath})` }
                    : { backgroundColor: shop.brandColor || designTemplate.brandColor }
                }
              >
                {shop.logoPath ? <span className="sr-only">{shop.name}</span> : "Logo"}
              </div>
              <label className="grid content-center gap-2 text-sm">
                <span className="font-semibold text-slate-200">Trocar logo por arquivo</span>
                <input
                  name="logoFile"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-950"
                />
                <span className="text-xs text-slate-500">
                  Ao enviar arquivo, ele substitui o caminho informado abaixo.
                </span>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Template</span>
                <select
                  name="designTemplate"
                  defaultValue={designTemplate.code}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                >
                  {TENANT_DESIGN_TEMPLATES.map((template) => (
                    <option key={template.code} value={template.code}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Fonte</span>
                <select
                  name="fontStyle"
                  defaultValue={fontStyle.code}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                >
                  {TENANT_FONT_STYLES.map((font) => (
                    <option key={font.code} value={font.code}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Cor principal</span>
                <input
                  name="brandColor"
                  type="color"
                  defaultValue={shop.brandColor || designTemplate.brandColor}
                  className="h-12 rounded-xl border border-white/10 bg-black/30 px-2"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Cor de fundo</span>
                <input
                  name="backgroundColor"
                  type="color"
                  defaultValue={shop.backgroundColor || designTemplate.backgroundColor}
                  className="h-12 rounded-xl border border-white/10 bg-black/30 px-2"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Cor da letra</span>
                <input
                  name="textColor"
                  type="color"
                  defaultValue={shop.textColor || designTemplate.textColor}
                  className="h-12 rounded-xl border border-white/10 bg-black/30 px-2"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Logo</span>
                <input
                  name="logoPath"
                  defaultValue={shop.logoPath || ""}
                  placeholder="/uploads/logo.png ou https://..."
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Favicon</span>
                <input
                  name="faviconPath"
                  defaultValue={shop.faviconPath || ""}
                  placeholder="/favicon.ico ou https://..."
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-semibold text-slate-200">Imagem principal</span>
                <input
                  name="heroImageUrl"
                  defaultValue={shop.heroImageUrl || ""}
                  placeholder="/uploads/hero.webp ou https://..."
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
            </div>
            <button className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950">
              Salvar design
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
          <h2 className="text-xl font-black">Conteudo da home</h2>
          <form action={updateTenantHomeContentAction} className="mt-4 grid gap-3">
            <input type="hidden" name="shopId" value={shop.id} />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Titulo Google</span>
                <input
                  name="metadataTitle"
                  defaultValue={shop.metadataTitle || ""}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">WhatsApp</span>
                <input
                  name="whatsappNumber"
                  defaultValue={shop.whatsappNumber || ""}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-semibold text-slate-200">Descricao Google</span>
                <textarea
                  name="metadataDescription"
                  defaultValue={shop.metadataDescription || ""}
                  className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Endereco</span>
                <input
                  name="addressLine"
                  defaultValue={shop.addressLine || ""}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Horario</span>
                <input
                  name="businessHours"
                  defaultValue={shop.businessHours || ""}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Instagram</span>
                <input
                  name="instagramUrl"
                  defaultValue={shop.instagramUrl || ""}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Texto atendimento</span>
                <input
                  name="attendanceText"
                  defaultValue={shop.attendanceText || ""}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Texto pequeno do hero</span>
                <input
                  name="heroEyebrow"
                  defaultValue={shop.heroEyebrow || ""}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Titulo principal</span>
                <input
                  name="heroTitle"
                  defaultValue={shop.heroTitle || ""}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-semibold text-slate-200">Subtitulo</span>
                <textarea
                  name="heroSubtitle"
                  defaultValue={shop.heroSubtitle || ""}
                  className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Botao principal</span>
                <input
                  name="primaryCtaLabel"
                  defaultValue={shop.primaryCtaLabel || ""}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Botao secundario</span>
                <input
                  name="secondaryCtaLabel"
                  defaultValue={shop.secondaryCtaLabel || ""}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Link secundario</span>
                <input
                  name="secondaryCtaHref"
                  defaultValue={shop.secondaryCtaHref || ""}
                  placeholder="/servicos"
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Titulo avaliacoes</span>
                <input
                  name="reviewsTitle"
                  defaultValue={shop.reviewsTitle || ""}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-semibold text-slate-200">Texto sem avaliacoes</span>
                <textarea
                  name="reviewsEmptyText"
                  defaultValue={shop.reviewsEmptyText || ""}
                  className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </label>
            </div>
            <button className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950">
              Salvar conteudo
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
          <h2 className="text-xl font-black">Dominio e SSL</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-300">
            <p>Dominio: {shop.primaryDomain || "Nao configurado"}</p>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusBadgeClass(domainReadiness.tone)}`}
                title={domainReadiness.message}
              >
                {domainReadiness.label}
              </span>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusBadgeClass(domainActivation.tone)}`}
                title={domainActivation.message}
              >
                {domainActivation.label}
              </span>
            </div>
            <p className="text-slate-400">{domainReadiness.message}</p>
            {domainActivation.canActivate ? (
              <form action={`/wr/tenants/${shop.id}/domain/activate`} method="post">
                <button
                  type="submit"
                  disabled={!activationEnabled}
                  className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 disabled:border disabled:border-white/10 disabled:bg-transparent disabled:text-slate-500"
                >
                  Ativar SSL
                </button>
              </form>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
          <h2 className="text-xl font-black">Equipe e agenda</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Admins
              </p>
              <div className="mt-2 grid gap-2">
                {admins.map((admin) => (
                  <div key={admin.id} className="rounded-xl bg-black/20 p-3 text-sm">
                    <strong className="block text-white">{admin.name}</strong>
                    <span className="text-slate-400">{admin.email}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Ultimos agendamentos
              </p>
              <div className="mt-2 grid gap-2">
                {latestAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-xl bg-black/20 p-3 text-sm text-slate-300"
                  >
                    {appointment.date.toLocaleString("pt-BR")} - {appointment.status}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="perigo"
          className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5"
        >
          <h2 className="text-xl font-black text-amber-100">Acesso</h2>
          {!shop.isDefault ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {shop.isActive ? (
                <form action={archiveTenantAction}>
                  <input type="hidden" name="shopId" value={shop.id} />
                  <input type="hidden" name="returnTo" value="detail" />
                  <button className="w-full rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100">
                    Arquivar e bloquear acesso
                  </button>
                </form>
              ) : (
                <form action={reactivateTenantAction}>
                  <input type="hidden" name="shopId" value={shop.id} />
                  <input type="hidden" name="returnTo" value="detail" />
                  <button className="w-full rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-100">
                    Reativar acesso
                  </button>
                </form>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-amber-100">
              A barbearia padrao nao pode ser arquivada ou excluida.
            </p>
          )}
        </section>

        {!shop.isDefault ? (
          <section className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5">
            <h2 className="text-xl font-black text-red-100">Excluir tenant</h2>
            <p className="mt-2 text-sm leading-6 text-red-100/80">
              Esta acao apaga a barbearia e os dados vinculados. Para continuar,
              confirme a exclusao e informe a senha atual do painel WR.
            </p>
            <form action={deleteTenantAction} className="mt-4 grid gap-3">
              <input type="hidden" name="shopId" value={shop.id} />
              <label className="flex items-center gap-3 rounded-xl border border-red-300/20 bg-black/20 p-3 text-sm font-bold text-red-100">
                <input name="confirmDelete" type="checkbox" required />
                Confirmo que quero excluir este tenant definitivamente.
              </label>
              <input
                name="wrPassword"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Senha do painel WR"
                className="rounded-xl border border-red-300/20 bg-black/30 px-4 py-3 text-white outline-none"
              />
              <button className="rounded-xl bg-red-300 px-4 py-3 text-sm font-black text-red-950">
                Excluir definitivamente
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </WrShell>
  );
}
