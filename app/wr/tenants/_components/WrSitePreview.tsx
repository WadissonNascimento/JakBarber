"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PUBLIC_HOME_CONTENT } from "@/lib/shopHomeContent";

type PreviewValues = {
  name: string;
  brandColor: string;
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

  const sections = [
    values.showServices ? values.servicesTitle : null,
    values.showBarbers ? values.barbersTitle : null,
    values.showProducts ? values.productsTitle : null,
    values.showReviews ? values.reviewsTitle : null,
    values.showAbout ? values.aboutTitle : null,
    values.showContact ? values.contactTitle : null,
  ].filter(Boolean);

  return (
    <aside className="grid gap-4 lg:sticky lg:top-5">
      <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              Preview ao vivo
            </p>
            <p className="mt-1 text-xs text-slate-500">Desktop compacto</p>
          </div>
          <span
            className="h-8 w-8 rounded-full border border-white/10"
            style={{ backgroundColor: values.brandColor }}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#05070b]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              {values.logoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.logoPath}
                  alt=""
                  className="h-9 w-9 rounded-lg object-cover"
                />
              ) : (
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black text-white"
                  style={{ backgroundColor: values.brandColor }}
                >
                  {values.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <strong className="max-w-[160px] truncate text-sm text-white">
                {values.name}
              </strong>
            </div>
            <div className="h-8 w-8 rounded-lg border border-white/10 bg-white/5" />
          </div>

          <div className="grid gap-5 p-4">
            <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{ color: values.brandColor }}
                >
                  {values.heroEyebrow}
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight text-white">
                  {values.heroTitle}
                </h3>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-300">
                  {values.heroSubtitle}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <span
                    className="rounded-lg px-3 py-2 text-center text-xs font-black text-white"
                    style={{ backgroundColor: values.brandColor }}
                  >
                    {values.primaryButtonLabel}
                  </span>
                  <span className="rounded-lg border border-white/10 px-3 py-2 text-center text-xs font-bold text-white">
                    {values.secondaryButtonLabel}
                  </span>
                </div>
              </div>
              <div className="min-h-[170px] rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-3">
                <div
                  className="h-full min-h-[145px] rounded-lg opacity-70"
                  style={{
                    background: `linear-gradient(135deg, ${values.brandColor}, transparent 58%), #0f172a`,
                  }}
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                [values.infoOneLabel, values.infoOneValue],
                [values.infoTwoLabel, values.infoTwoValue],
                [values.infoThreeLabel, values.infoThreeValue],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <p
                    className="text-[10px] font-black uppercase"
                    style={{ color: values.brandColor }}
                  >
                    {label}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-300">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              {sections.map((section) => (
                <div
                  key={section}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white"
                >
                  {section}
                </div>
              ))}
            </div>

            <p className="border-t border-white/10 pt-3 text-center text-[11px] text-slate-500">
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
    </aside>
  );
}
