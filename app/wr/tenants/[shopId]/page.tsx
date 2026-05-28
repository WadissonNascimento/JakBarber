import Link from "next/link";
import { notFound } from "next/navigation";
import { basePrisma } from "@/lib/prisma-core";
import { mergePublicHomeContent } from "@/lib/shopHomeContent";
import { requireWrAdminSession } from "@/lib/wrSession";
import WrSitePreview from "../_components/WrSitePreview";
import WrShell from "../../WrShell";
import { updateTenantPublicSiteAction } from "./actions";

export const dynamic = "force-dynamic";

type WrTenantSitePageProps = {
  params: Promise<{ shopId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getFlashParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: "notice" | "error"
) {
  const value = params?.[key];
  return typeof value === "string" ? value : null;
}

function textInput(
  label: string,
  name: string,
  value: string | null | undefined,
  placeholder?: string
) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-slate-200">{label}</span>
      <input
        name={name}
        defaultValue={value || ""}
        placeholder={placeholder}
        className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
      />
    </label>
  );
}

function textareaInput(
  label: string,
  name: string,
  value: string | null | undefined,
  placeholder?: string
) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-slate-200">{label}</span>
      <textarea
        name={name}
        defaultValue={value || ""}
        placeholder={placeholder}
        rows={3}
        className="resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
      />
    </label>
  );
}

function toggleInput(label: string, name: string, checked: boolean) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-slate-200">
      <input
        name={name}
        type="checkbox"
        defaultChecked={checked}
        className="h-4 w-4 accent-cyan-300"
      />
      {label}
    </label>
  );
}

function fontSelect(value: string | null | undefined) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-slate-200">Fonte do site</span>
      <select
        name="fontFamily"
        defaultValue={value || "modern"}
        className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
      >
        <option value="modern">Moderna limpa</option>
        <option value="display">Marcante</option>
        <option value="system">Sistema</option>
        <option value="serif">Classica</option>
      </select>
    </label>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <h2 className="text-lg font-black">{title}</h2>
      {children}
    </section>
  );
}

export default async function WrTenantSitePage({
  params,
  searchParams,
}: WrTenantSitePageProps) {
  const [{ user }, routeParams, flashParams] = await Promise.all([
    requireWrAdminSession(),
    params,
    searchParams,
  ]);
  const shop = await basePrisma.shop.findUnique({
    where: { id: routeParams.shopId },
    include: {
      homeContent: true,
    },
  });

  if (!shop) {
    notFound();
  }

  const content = mergePublicHomeContent(shop.homeContent, {
    infoOneValue: shop.addressLine || "Endereco sob consulta",
    infoTwoValue: shop.businessHours || "Horario sob consulta",
  });
  const notice = getFlashParam(flashParams, "notice");
  const error = getFlashParam(flashParams, "error");
  const previewUrl = shop.primaryDomain ? `https://${shop.primaryDomain}` : null;
  const formId = "wr-tenant-site-editor";

  return (
    <WrShell userName={user.name}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/wr/tenants" className="text-sm text-cyan-200 hover:underline">
            Voltar para barbearias
          </Link>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
            Site editavel
          </p>
          <h1 className="mt-2 text-3xl font-black">{shop.name}</h1>
          <p className="mt-2 text-sm text-slate-400">{shop.id}</p>
        </div>
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-slate-100 hover:border-cyan-300/60"
          >
            Abrir site
          </a>
        ) : null}
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

      {shop.isDefault ? (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5 text-sm leading-7 text-amber-100">
          A Jak Barber esta bloqueada para edicao pelo painel WR. Essa trava evita
          alterar o tenant principal por acidente.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <form id={formId} action={updateTenantPublicSiteAction} className="grid gap-5">
            <input type="hidden" name="shopId" value={shop.id} />

            <SectionCard title="Identidade e dominio">
              <div className="grid gap-4 md:grid-cols-2">
                {textInput("Nome publico", "name", shop.name)}
                {textInput("Dominio principal", "primaryDomain", shop.primaryDomain)}
                {textInput("Logo", "logoPath", shop.logoPath, "/uploads/logo.png ou https://")}
                {textInput("Favicon", "faviconPath", shop.faviconPath, "/favicon.ico ou https://")}
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-slate-200">Cor principal</span>
                  <input
                    name="brandColor"
                    type="color"
                    defaultValue={shop.brandColor || "#14b8a6"}
                    className="h-12 rounded-xl border border-white/10 bg-black/30 p-1"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-slate-200">Cor de fundo</span>
                  <input
                    name="backgroundColor"
                    type="color"
                    defaultValue={shop.backgroundColor || "#05070b"}
                    className="h-12 rounded-xl border border-white/10 bg-black/30 p-1"
                  />
                </label>
                {fontSelect(shop.fontFamily)}
                {textInput("Horario", "businessHours", shop.businessHours)}
                {textInput("WhatsApp", "whatsappNumber", shop.whatsappNumber)}
                {textInput("Instagram", "instagramUrl", shop.instagramUrl)}
                {textInput("Endereco", "addressLine", shop.addressLine)}
              </div>
            </SectionCard>

            <SectionCard title="SEO">
              <div className="grid gap-4 md:grid-cols-2">
                {textInput("Titulo Google", "metadataTitle", shop.metadataTitle)}
                {textareaInput(
                  "Descricao Google",
                  "metadataDescription",
                  shop.metadataDescription
                )}
              </div>
            </SectionCard>

            <SectionCard title="Hero e botoes">
              <div className="grid gap-4 md:grid-cols-2">
                {textInput("Texto pequeno acima do titulo", "heroEyebrow", content.heroEyebrow)}
                {textInput("Titulo principal", "heroTitle", content.heroTitle)}
                {textareaInput("Texto principal", "heroSubtitle", content.heroSubtitle)}
                {textInput("Botao principal", "primaryButtonLabel", content.primaryButtonLabel)}
                {textInput("Link principal", "primaryButtonHref", content.primaryButtonHref)}
                {textInput(
                  "Botao secundario",
                  "secondaryButtonLabel",
                  content.secondaryButtonLabel
                )}
                {textInput("Link secundario", "secondaryButtonHref", content.secondaryButtonHref)}
              </div>
            </SectionCard>

            <SectionCard title="Cartoes informativos">
              <div className="grid gap-4 md:grid-cols-3">
                {textInput("Card 1 titulo", "infoOneLabel", content.infoOneLabel)}
                {textInput("Card 1 texto", "infoOneValue", content.infoOneValue)}
                {textInput("Card 2 titulo", "infoTwoLabel", content.infoTwoLabel)}
                {textInput("Card 2 texto", "infoTwoValue", content.infoTwoValue)}
                {textInput("Card 3 titulo", "infoThreeLabel", content.infoThreeLabel)}
                {textInput("Card 3 texto", "infoThreeValue", content.infoThreeValue)}
              </div>
            </SectionCard>

            <SectionCard title="Secoes da home">
              <div className="grid gap-3 md:grid-cols-3">
                {toggleInput("Mostrar servicos", "showServices", content.showServices)}
                {toggleInput("Mostrar barbeiros", "showBarbers", content.showBarbers)}
                {toggleInput("Mostrar produtos", "showProducts", content.showProducts)}
                {toggleInput("Mostrar avaliacoes", "showReviews", content.showReviews)}
                {toggleInput("Mostrar sobre", "showAbout", content.showAbout)}
                {toggleInput("Mostrar contato", "showContact", content.showContact)}
              </div>
            </SectionCard>

            <SectionCard title="Textos das secoes">
              <div className="grid gap-4 md:grid-cols-2">
              {textInput("Servicos chamada pequena", "servicesEyebrow", content.servicesEyebrow)}
                {textInput("Servicos titulo", "servicesTitle", content.servicesTitle)}
                {textareaInput(
                  "Servicos descricao",
                  "servicesDescription",
                  content.servicesDescription
                )}
              {textInput("Barbeiros chamada pequena", "barbersEyebrow", content.barbersEyebrow)}
                {textInput("Barbeiros titulo", "barbersTitle", content.barbersTitle)}
                {textareaInput(
                  "Barbeiros descricao",
                  "barbersDescription",
                  content.barbersDescription
                )}
              {textInput("Produtos chamada pequena", "productsEyebrow", content.productsEyebrow)}
                {textInput("Produtos titulo", "productsTitle", content.productsTitle)}
                {textareaInput(
                  "Produtos descricao",
                  "productsDescription",
                  content.productsDescription
                )}
              {textInput("Avaliacoes chamada pequena", "reviewsEyebrow", content.reviewsEyebrow)}
                {textInput("Avaliacoes titulo", "reviewsTitle", content.reviewsTitle)}
                {textareaInput("Texto sem avaliacoes", "reviewsEmptyText", content.reviewsEmptyText)}
              {textInput("Sobre chamada pequena", "aboutEyebrow", content.aboutEyebrow)}
                {textInput("Sobre titulo", "aboutTitle", content.aboutTitle)}
                {textareaInput("Sobre texto", "aboutBody", content.aboutBody)}
              {textInput("Contato chamada pequena", "contactEyebrow", content.contactEyebrow)}
                {textInput("Contato titulo", "contactTitle", content.contactTitle)}
                {textareaInput("Contato texto", "contactBody", content.contactBody)}
                {textInput("Rodape", "footerText", content.footerText)}
              </div>
            </SectionCard>

            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
            >
              Salvar site
            </button>
          </form>

          <WrSitePreview
            formId={formId}
            initialValues={{
              name: shop.name,
              brandColor: shop.brandColor || "#14b8a6",
              backgroundColor: shop.backgroundColor || "#05070b",
              fontFamily: shop.fontFamily || "modern",
              logoPath: shop.logoPath || "",
              metadataTitle: shop.metadataTitle || shop.name,
              metadataDescription: shop.metadataDescription || "",
              ...content,
            }}
          />
        </div>
      )}
    </WrShell>
  );
}
