"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_PUBLIC_HOME_CONTENT } from "@/lib/shopHomeContent";

type PreviewValues = {
  name: string;
  brandColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  logoPath: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryButtonLabel: string;
  secondaryButtonLabel: string;
  infoOneLabel: string;
  infoOneValue: string;
  infoTwoLabel: string;
  infoTwoValue: string;
  infoThreeLabel: string;
  infoThreeValue: string;
  showServices: boolean;
  showBarbers: boolean;
  showProducts: boolean;
  showReviews: boolean;
  showAbout: boolean;
  showContact: boolean;
  servicesTitle: string;
  barbersTitle: string;
  productsTitle: string;
  reviewsTitle: string;
  aboutTitle: string;
  contactTitle: string;
  footerText: string;
  metadataTitle: string;
  metadataDescription: string;
};

type WrSitePreviewProps = {
  formId: string;
  initialValues: Partial<PreviewValues>;
};

function pickString(formData: FormData, key: string, fallback: string) {
  const value = formData.get(key)?.toString().trim();
  return value || fallback;
}

function pickBoolean(formData: FormData, key: string, fallback: boolean) {
  return formData.has(key) ? formData.get(key) === "on" : fallback;
}

function readValues(form: HTMLFormElement | null, initial: PreviewValues): PreviewValues {
  if (!form) {
    return initial;
  }

  const formData = new FormData(form);

  return {
    name: pickString(formData, "name", initial.name),
    brandColor: pickString(formData, "brandColor", initial.brandColor),
    backgroundColor: pickString(
      formData,
      "backgroundColor",
      initial.backgroundColor
    ),
    textColor: pickString(formData, "textColor", initial.textColor),
    fontFamily: pickString(formData, "fontFamily", initial.fontFamily),
    logoPath: pickString(formData, "logoPath", initial.logoPath),
    heroEyebrow: pickString(formData, "heroEyebrow", initial.heroEyebrow),
    heroTitle: pickString(formData, "heroTitle", initial.heroTitle),
    heroSubtitle: pickString(formData, "heroSubtitle", initial.heroSubtitle),
    primaryButtonLabel: pickString(
      formData,
      "primaryButtonLabel",
      initial.primaryButtonLabel
    ),
    secondaryButtonLabel: pickString(
      formData,
      "secondaryButtonLabel",
      initial.secondaryButtonLabel
    ),
    infoOneLabel: pickString(formData, "infoOneLabel", initial.infoOneLabel),
    infoOneValue: pickString(formData, "infoOneValue", initial.infoOneValue),
    infoTwoLabel: pickString(formData, "infoTwoLabel", initial.infoTwoLabel),
    infoTwoValue: pickString(formData, "infoTwoValue", initial.infoTwoValue),
    infoThreeLabel: pickString(formData, "infoThreeLabel", initial.infoThreeLabel),
    infoThreeValue: pickString(formData, "infoThreeValue", initial.infoThreeValue),
    showServices: pickBoolean(formData, "showServices", initial.showServices),
    showBarbers: pickBoolean(formData, "showBarbers", initial.showBarbers),
    showProducts: pickBoolean(formData, "showProducts", initial.showProducts),
    showReviews: pickBoolean(formData, "showReviews", initial.showReviews),
    showAbout: pickBoolean(formData, "showAbout", initial.showAbout),
    showContact: pickBoolean(formData, "showContact", initial.showContact),
    servicesTitle: pickString(formData, "servicesTitle", initial.servicesTitle),
    barbersTitle: pickString(formData, "barbersTitle", initial.barbersTitle),
    productsTitle: pickString(formData, "productsTitle", initial.productsTitle),
    reviewsTitle: pickString(formData, "reviewsTitle", initial.reviewsTitle),
    aboutTitle: pickString(formData, "aboutTitle", initial.aboutTitle),
    contactTitle: pickString(formData, "contactTitle", initial.contactTitle),
    footerText: pickString(formData, "footerText", initial.footerText),
    metadataTitle: pickString(formData, "metadataTitle", initial.metadataTitle),
    metadataDescription: pickString(
      formData,
      "metadataDescription",
      initial.metadataDescription
    ),
  };
}

function buildInitialValues(values: Partial<PreviewValues>): PreviewValues {
  return {
    name: values.name || "Nome da barbearia",
    brandColor: values.brandColor || "#14b8a6",
    backgroundColor: values.backgroundColor || "#05070b",
    textColor: values.textColor || "#ffffff",
    fontFamily: values.fontFamily || "modern",
    logoPath: values.logoPath || "",
    heroEyebrow: values.heroEyebrow || DEFAULT_PUBLIC_HOME_CONTENT.heroEyebrow,
    heroTitle: values.heroTitle || DEFAULT_PUBLIC_HOME_CONTENT.heroTitle,
    heroSubtitle: values.heroSubtitle || DEFAULT_PUBLIC_HOME_CONTENT.heroSubtitle,
    primaryButtonLabel:
      values.primaryButtonLabel || DEFAULT_PUBLIC_HOME_CONTENT.primaryButtonLabel,
    secondaryButtonLabel:
      values.secondaryButtonLabel || DEFAULT_PUBLIC_HOME_CONTENT.secondaryButtonLabel,
    infoOneLabel: values.infoOneLabel || DEFAULT_PUBLIC_HOME_CONTENT.infoOneLabel,
    infoOneValue: values.infoOneValue || DEFAULT_PUBLIC_HOME_CONTENT.infoOneValue,
    infoTwoLabel: values.infoTwoLabel || DEFAULT_PUBLIC_HOME_CONTENT.infoTwoLabel,
    infoTwoValue: values.infoTwoValue || DEFAULT_PUBLIC_HOME_CONTENT.infoTwoValue,
    infoThreeLabel: values.infoThreeLabel || DEFAULT_PUBLIC_HOME_CONTENT.infoThreeLabel,
    infoThreeValue: values.infoThreeValue || DEFAULT_PUBLIC_HOME_CONTENT.infoThreeValue,
    showServices: values.showServices ?? DEFAULT_PUBLIC_HOME_CONTENT.showServices,
    showBarbers: values.showBarbers ?? DEFAULT_PUBLIC_HOME_CONTENT.showBarbers,
    showProducts: values.showProducts ?? DEFAULT_PUBLIC_HOME_CONTENT.showProducts,
    showReviews: values.showReviews ?? DEFAULT_PUBLIC_HOME_CONTENT.showReviews,
    showAbout: values.showAbout ?? DEFAULT_PUBLIC_HOME_CONTENT.showAbout,
    showContact: values.showContact ?? DEFAULT_PUBLIC_HOME_CONTENT.showContact,
    servicesTitle: values.servicesTitle || DEFAULT_PUBLIC_HOME_CONTENT.servicesTitle,
    barbersTitle: values.barbersTitle || DEFAULT_PUBLIC_HOME_CONTENT.barbersTitle,
    productsTitle: values.productsTitle || DEFAULT_PUBLIC_HOME_CONTENT.productsTitle,
    reviewsTitle: values.reviewsTitle || DEFAULT_PUBLIC_HOME_CONTENT.reviewsTitle,
    aboutTitle: values.aboutTitle || DEFAULT_PUBLIC_HOME_CONTENT.aboutTitle,
    contactTitle: values.contactTitle || DEFAULT_PUBLIC_HOME_CONTENT.contactTitle,
    footerText: values.footerText || DEFAULT_PUBLIC_HOME_CONTENT.footerText,
    metadataTitle: values.metadataTitle || values.name || "Nome da barbearia",
    metadataDescription:
      values.metadataDescription ||
      "Agende seu horario online e acompanhe seus atendimentos.",
  };
}

function previewFontStack(fontFamily: string) {
  if (fontFamily === "display") {
    return "var(--font-heading), sans-serif";
  }

  if (fontFamily === "system") {
    return "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  }

  if (fontFamily === "serif") {
    return "Georgia, 'Times New Roman', serif";
  }

  return "var(--font-body), sans-serif";
}

function MiniPagePreview({
  title,
  eyebrow,
  values,
  children,
}: {
  title: string;
  eyebrow: string;
  values: PreviewValues;
  children: ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10"
      style={{
        backgroundColor: values.backgroundColor,
        color: values.textColor,
        fontFamily: previewFontStack(values.fontFamily),
      }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: values.brandColor }}
          >
            {eyebrow}
          </p>
          <h4 className="mt-1 text-sm font-black" style={{ color: values.textColor }}>
            {title}
          </h4>
        </div>
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: values.brandColor }}
        />
      </div>
      <div className="grid gap-3 p-4">{children}</div>
    </div>
  );
}

export default function WrSitePreview({ formId, initialValues }: WrSitePreviewProps) {
  const initial = useMemo(() => buildInitialValues(initialValues), [initialValues]);
  const [values, setValues] = useState(initial);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;

    function refresh() {
      setValues(readValues(form, initial));
    }

    refresh();
    form?.addEventListener("input", refresh);
    form?.addEventListener("change", refresh);

    return () => {
      form?.removeEventListener("input", refresh);
      form?.removeEventListener("change", refresh);
    };
  }, [formId, initial]);

  return (
    <aside className="grid gap-4 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto xl:pr-1">
      <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              Preview ao vivo
            </p>
            <p className="mt-1 text-xs text-slate-500">Mobile publico</p>
          </div>
          <span
            className="h-8 w-8 rounded-full border border-white/10"
            style={{ backgroundColor: values.brandColor }}
          />
        </div>

        <div
          className="mx-auto max-w-[390px] overflow-hidden rounded-2xl border border-white/10 text-white"
          style={{
            backgroundColor: values.backgroundColor,
            color: values.textColor,
            fontFamily: previewFontStack(values.fontFamily),
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div className="flex items-center gap-2">
              {values.logoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.logoPath}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-black text-white"
                  style={{ backgroundColor: values.brandColor }}
                >
                  {values.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <strong className="max-w-[160px] truncate text-sm" style={{ color: values.textColor }}>
                {values.name}
              </strong>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <span className="h-0.5 w-4 rounded-full bg-white/70" />
            </div>
          </div>

          <div className="grid gap-7 px-4 pb-5 pt-6">
            <div className="grid gap-5">
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{ color: values.brandColor }}
                >
                  {values.heroEyebrow}
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight" style={{ color: values.textColor }}>
                  {values.heroTitle}
                </h3>
                <p className="mt-2 line-clamp-3 text-xs leading-5 opacity-80">
                  {values.heroSubtitle}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2">
                <div
                  className="h-[210px] rounded-xl opacity-80"
                  style={{
                    background: `linear-gradient(135deg, ${values.brandColor}, transparent 58%), #0f172a`,
                  }}
                />
              </div>
              <div className="grid gap-2">
                <span
                  className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-center text-xs font-black text-white"
                  style={{ backgroundColor: values.brandColor }}
                >
                  {values.primaryButtonLabel}
                </span>
                <span
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-xs font-bold"
                  style={{ color: values.textColor }}
                >
                  {values.secondaryButtonLabel}
                </span>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                [values.infoOneLabel, values.infoOneValue],
                [values.infoTwoLabel, values.infoTwoValue],
                [values.infoThreeLabel, values.infoThreeValue],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                >
                  <p
                    className="text-[10px] font-black uppercase tracking-[0.12em]"
                    style={{ color: values.brandColor }}
                  >
                    {label}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs opacity-80">{value}</p>
                </div>
              ))}
            </div>

            {values.showReviews ? (
              <div className="grid gap-5">
                <div
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                >
                  <p
                    className="text-[10px] font-black uppercase tracking-[0.18em]"
                    style={{ color: values.brandColor }}
                  >
                    Avaliacoes
                  </p>
                  <h4 className="mt-2 text-base font-black leading-tight" style={{ color: values.textColor }}>
                    {values.reviewsTitle}
                  </h4>
                  <div className="mt-3 rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-3 text-xs leading-5 opacity-70">
                    Avaliacoes reais dos clientes aparecem aqui.
                  </div>
                </div>
              </div>
            ) : null}

            <p className="border-t border-white/10 pt-4 text-center text-[11px] text-slate-500">
              {values.footerText}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Google
        </p>
        <p className="mt-3 text-sm text-blue-300">{values.metadataTitle}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
          {values.metadataDescription}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Outras paginas
        </p>
        <div className="mt-4 grid gap-3">
          <MiniPagePreview title="Agendar horario" eyebrow="Agenda" values={values}>
            <div className="grid gap-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] opacity-60">
                  Servico
                </p>
                <p className="mt-1 text-xs font-bold">Corte</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["09:00", "10:30", "14:00"].map((time) => (
                  <span
                    key={time}
                    className="rounded-lg border border-white/10 px-2 py-2 text-center text-[11px] font-bold"
                  >
                    {time}
                  </span>
                ))}
              </div>
              <span
                className="mt-1 rounded-lg px-3 py-2 text-center text-xs font-black text-white"
                style={{ backgroundColor: values.brandColor }}
              >
                Continuar
              </span>
            </div>
          </MiniPagePreview>

          <MiniPagePreview title="Entrar na conta" eyebrow="Login" values={values}>
            <div className="grid gap-2">
              <div className="h-10 rounded-lg border border-white/10 bg-white/[0.04]" />
              <div className="h-10 rounded-lg border border-white/10 bg-white/[0.04]" />
              <span
                className="rounded-lg px-3 py-2 text-center text-xs font-black text-white"
                style={{ backgroundColor: values.brandColor }}
              >
                Entrar
              </span>
            </div>
          </MiniPagePreview>

          <MiniPagePreview title="Painel do cliente" eyebrow="Area logada" values={values}>
            <div className="grid gap-2">
              {["Proximo horario", "Historico", "Notificacoes"].map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3"
                >
                  <span className="text-xs font-bold">{label}</span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: values.brandColor }}
                  />
                </div>
              ))}
            </div>
          </MiniPagePreview>
        </div>
      </div>
    </aside>
  );
}
