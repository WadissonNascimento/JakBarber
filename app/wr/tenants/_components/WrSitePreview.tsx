"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
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

type PreviewPage = "home" | "booking" | "login" | "customer";
type EditableTextKey =
  | "name"
  | "heroEyebrow"
  | "heroTitle"
  | "heroSubtitle"
  | "primaryButtonLabel"
  | "secondaryButtonLabel"
  | "infoOneLabel"
  | "infoOneValue"
  | "infoTwoLabel"
  | "infoTwoValue"
  | "infoThreeLabel"
  | "infoThreeValue"
  | "reviewsTitle"
  | "footerText";
type ColorKey = "brandColor" | "backgroundColor" | "textColor";

const pageTabs: Array<{ key: PreviewPage; label: string }> = [
  { key: "home", label: "Home" },
  { key: "booking", label: "Agendar" },
  { key: "login", label: "Login" },
  { key: "customer", label: "Cliente" },
];

const fieldLabels: Record<string, string> = {
  name: "Nome",
  heroEyebrow: "Texto pequeno",
  heroTitle: "Titulo principal",
  heroSubtitle: "Texto principal",
  primaryButtonLabel: "Botao principal",
  secondaryButtonLabel: "Botao secundario",
  infoOneLabel: "Card 1 titulo",
  infoOneValue: "Card 1 texto",
  infoTwoLabel: "Card 2 titulo",
  infoTwoValue: "Card 2 texto",
  infoThreeLabel: "Card 3 titulo",
  infoThreeValue: "Card 3 texto",
  reviewsTitle: "Titulo das avaliacoes",
  footerText: "Rodape",
  brandColor: "Cor principal",
  backgroundColor: "Fundo da pagina",
  textColor: "Cor da letra",
  fontFamily: "Fonte do site",
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

function setNativeValue(field: Element, value: string) {
  const element = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function editableKeyDown(event: KeyboardEvent<HTMLElement>, multiline = false) {
  if (!multiline && event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

function EditableText({
  field,
  values,
  activeField,
  multiline = false,
  className,
  style,
  onPick,
  onCommit,
}: {
  field: EditableTextKey;
  values: PreviewValues;
  activeField: string;
  multiline?: boolean;
  className: string;
  style?: CSSProperties;
  onPick: (field: EditableTextKey) => void;
  onCommit: (field: EditableTextKey, value: string) => void;
}) {
  const Component = multiline ? "p" : "span";

  return (
    <Component
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      tabIndex={0}
      className={`${className} rounded-md outline-none transition ${
        activeField === field
          ? "ring-2 ring-cyan-300/80 ring-offset-2 ring-offset-slate-950"
          : "hover:ring-1 hover:ring-cyan-300/50"
      }`}
      style={style}
      onFocus={() => onPick(field)}
      onClick={() => onPick(field)}
      onInput={(event) => onCommit(field, event.currentTarget.innerText)}
      onBlur={(event) => onCommit(field, event.currentTarget.innerText)}
      onKeyDown={(event) => editableKeyDown(event, multiline)}
    >
      {values[field]}
    </Component>
  );
}

export default function WrSitePreview({ formId, initialValues }: WrSitePreviewProps) {
  const initial = useMemo(() => buildInitialValues(initialValues), [initialValues]);
  const [values, setValues] = useState(initial);
  const [activePage, setActivePage] = useState<PreviewPage>("home");
  const [activeField, setActiveField] = useState<string>("backgroundColor");

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

  function updateFormValue(key: string, value: string) {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    const field = form?.elements.namedItem(key);

    if (field instanceof RadioNodeList) {
      return;
    }

    if (field) {
      setNativeValue(field, value);
    }

    setValues((current) => readValues(form, { ...current, [key]: value }));
  }

  function selectColorTarget(key: ColorKey) {
    setActiveField(key);
  }

  function updateColor(key: ColorKey, value: string) {
    selectColorTarget(key);
    updateFormValue(key, value);
  }

  function updateFont(value: string) {
    setActiveField("fontFamily");
    updateFormValue("fontFamily", value);
  }

  function pickText(field: EditableTextKey) {
    setActiveField(field);
  }

  function commitText(field: EditableTextKey, value: string) {
    const normalized = value.trim().replace(/\s+/g, " ");
    updateFormValue(field, normalized || initial[field]);
  }

  const appStyle = {
    backgroundColor: values.backgroundColor,
    color: values.textColor,
    fontFamily: previewFontStack(values.fontFamily),
  };
  const previewVars = {
    ...appStyle,
    "--brand": values.brandColor,
    "--brand-strong": values.brandColor,
    "--brand-muted": `${values.brandColor}2e`,
    "--text-primary": values.textColor,
    "--text-secondary": values.textColor,
  } as CSSProperties;

  const cardClass = "rounded-lg border border-white/10 bg-white/[0.04] p-4";

  return (
    <aside className="grid gap-4 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto xl:pr-1">
      <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              Editor visual
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Clique nos textos, botoes e areas para editar.
            </p>
          </div>
          <button
            type="button"
            className="h-8 w-8 rounded-full border border-white/10"
            style={{ backgroundColor: values.brandColor }}
            onClick={() => selectColorTarget("brandColor")}
            aria-label="Editar cor principal"
          />
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {pageTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActivePage(tab.key)}
              className={`min-h-9 rounded-lg border px-2 text-xs font-black transition ${
                activePage === tab.key
                  ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className="overflow-hidden rounded-2xl border border-white/10"
          style={previewVars}
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              selectColorTarget("backgroundColor");
            }
          }}
        >
          <div
            className={`flex items-center justify-between border-b border-white/10 px-5 py-4 ${
              activeField === "backgroundColor" ? "ring-2 ring-cyan-300/70" : ""
            }`}
            onClick={() => selectColorTarget("backgroundColor")}
          >
            <div className="flex items-center gap-2">
              {values.logoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.logoPath}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-black text-white"
                  style={{ backgroundColor: values.brandColor }}
                  onClick={(event) => {
                    event.stopPropagation();
                    selectColorTarget("brandColor");
                  }}
                >
                  {values.name.slice(0, 2).toUpperCase()}
                </button>
              )}
              <EditableText
                field="name"
                values={values}
                activeField={activeField}
                className="max-w-[160px] truncate text-sm font-black"
                style={{ color: values.textColor }}
                onPick={pickText}
                onCommit={commitText}
              />
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
              onClick={(event) => {
                event.stopPropagation();
                selectColorTarget("textColor");
              }}
            >
              <span className="h-0.5 w-4 rounded-full bg-white/70" />
            </button>
          </div>

          {activePage === "home" ? (
            <main className="relative min-h-[720px] overflow-hidden text-[var(--text-primary)]">
              <section className="grid gap-8 px-5 pb-10 pt-6 xl:grid-cols-[0.95fr_1.05fr] xl:items-center">
                <div>
                  <EditableText
                    field="heroEyebrow"
                    values={values}
                    activeField={activeField}
                    className="inline-block text-xs font-black uppercase tracking-[0.22em] text-[var(--brand-strong)]"
                    onPick={pickText}
                    onCommit={commitText}
                  />
                  <EditableText
                    field="heroTitle"
                    values={values}
                    activeField={activeField}
                    className="mt-5 block text-4xl font-black leading-tight xl:text-5xl"
                    style={{ color: values.textColor }}
                    onPick={pickText}
                    onCommit={commitText}
                  />
                  <EditableText
                    field="heroSubtitle"
                    values={values}
                    activeField={activeField}
                    multiline
                    className="mt-4 block max-w-xl text-sm leading-7 text-[var(--text-secondary)]"
                    onPick={pickText}
                    onCommit={commitText}
                  />
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--brand)] px-5 py-3 text-center text-sm font-black text-white transition hover:brightness-110 ${
                        activeField === "brandColor" ? "ring-2 ring-cyan-300/70" : ""
                      }`}
                      onClick={() => selectColorTarget("brandColor")}
                    >
                      <EditableText
                        field="primaryButtonLabel"
                        values={values}
                        activeField={activeField}
                        className="font-black"
                        onPick={pickText}
                        onCommit={commitText}
                      />
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-bold text-[var(--text-primary)]"
                      onClick={() => selectColorTarget("textColor")}
                    >
                      <EditableText
                        field="secondaryButtonLabel"
                        values={values}
                        activeField={activeField}
                        className="font-bold"
                        onPick={pickText}
                        onCommit={commitText}
                      />
                    </button>
                  </div>
                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    {[
                      ["infoOneLabel", "infoOneValue"],
                      ["infoTwoLabel", "infoTwoValue"],
                      ["infoThreeLabel", "infoThreeValue"],
                    ].map(([labelField, valueField]) => (
                      <button
                        key={labelField}
                        type="button"
                        className="surface-card rounded-lg p-4 text-left hover:ring-1 hover:ring-cyan-300/50"
                        onClick={() => selectColorTarget("backgroundColor")}
                      >
                        <EditableText
                          field={labelField as EditableTextKey}
                          values={values}
                          activeField={activeField}
                          className="inline-block text-xs text-[var(--brand-strong)]"
                          onPick={pickText}
                          onCommit={commitText}
                        />
                        <EditableText
                          field={valueField as EditableTextKey}
                          values={values}
                          activeField={activeField}
                          className="mt-2 block text-sm text-[var(--text-secondary)]"
                          onPick={pickText}
                          onCommit={commitText}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-left ${
                    activeField === "brandColor" ? "ring-2 ring-cyan-300/70" : ""
                  }`}
                  onClick={() => selectColorTarget("brandColor")}
                >
                  <div
                    className="relative h-[420px] overflow-hidden rounded-xl"
                    style={{
                      background: `linear-gradient(145deg, ${values.brandColor}, transparent 52%), linear-gradient(315deg, #020617, #111827)`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
                  </div>
                </button>
              </section>

              {values.showReviews ? (
                <section className="px-5 pb-10">
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-strong)]">
                      Avaliacoes
                    </p>
                    <EditableText
                      field="reviewsTitle"
                      values={values}
                      activeField={activeField}
                      className="mt-2 block text-2xl font-black text-[var(--text-primary)]"
                      onPick={pickText}
                      onCommit={commitText}
                    />
                  </div>
                  <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.04] p-5 text-sm text-[var(--text-secondary)]">
                    Avaliacoes reais dos clientes aparecem aqui.
                  </div>
                </section>
              ) : null}

              <EditableText
                field="footerText"
                values={values}
                activeField={activeField}
                className="mx-5 block border-t border-white/10 pb-8 pt-4 text-center text-xs text-zinc-500"
                onPick={pickText}
                onCommit={commitText}
              />
            </main>
          ) : null}

          {activePage === "booking" ? (
            <main className="page-shell max-w-5xl overflow-hidden px-5 pb-8 pt-6 text-white">
              <div className="mb-6">
                <h1 className="text-4xl font-bold tracking-tight">Agendar horario</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
                  Escolha o servico e toque em um horario disponivel.
                </p>
              </div>

              <section className="surface-card max-w-full overflow-hidden rounded-[24px] p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-zinc-200">
                        Barbeiro
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Alex", "Bruno", "Carlos"].map((barber, index) => (
                          <button
                            key={barber}
                            type="button"
                            className={`rounded-xl border px-3 py-2 text-left ${
                              index === 0
                                ? "border-[var(--brand)] bg-[var(--brand-muted)]"
                                : "border-white/10 bg-black/20"
                            }`}
                            onClick={() => selectColorTarget("brandColor")}
                          >
                            <span className="flex items-center gap-2">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/30 via-white/10 to-black/20 text-sm font-bold text-[var(--brand-strong)]">
                                {barber[0]}
                              </span>
                              <span className="text-sm font-semibold">{barber}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-zinc-200">
                        Servicos
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {["Corte", "Barba", "Corte + Barba", "Sobrancelha"].map(
                          (service, index) => (
                            <button
                              key={service}
                              type="button"
                              className={`rounded-2xl border px-4 py-3 text-left ${
                                index === 0
                                  ? "border-[var(--brand)] bg-[var(--brand-muted)]"
                                  : "border-white/10 bg-black/20"
                              }`}
                              onClick={() => selectColorTarget("brandColor")}
                            >
                              <p className="text-sm font-semibold">{service}</p>
                              <p className="mt-1 text-xs text-zinc-400">R$ 45,00 - 40 min</p>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-zinc-200">
                        Data
                      </label>
                      <div className="flex gap-2 overflow-hidden">
                        {["Hoje", "Sex", "Sab", "Dom"].map((day, index) => (
                          <button
                            key={day}
                            type="button"
                            className={`min-w-[82px] rounded-2xl border px-3 py-3 text-left ${
                              index === 0
                                ? "border-[var(--brand)] bg-[var(--brand-muted)]"
                                : "border-white/10 bg-black/20"
                            }`}
                            onClick={() => selectColorTarget("brandColor")}
                          >
                            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              {day}
                            </p>
                            <p className="mt-1 text-sm font-semibold">28/05</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Resumo
                    </p>
                    <p className="mt-3 text-lg font-black">Corte</p>
                    <p className="mt-1 text-sm text-zinc-400">Alex - R$ 45,00</p>
                    <button
                      type="button"
                      className="mt-5 w-full rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-white"
                      onClick={() => selectColorTarget("brandColor")}
                    >
                      Proximo passo
                    </button>
                  </div>
                </div>
              </section>

              <section className="surface-card mt-4 rounded-[24px] p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Horarios disponiveis</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Escolha um horario para continuar.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
                    Total atual - R$ 45,00
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {["Manha", "Tarde", "Noite"].map((period) => (
                    <div key={period} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                        {period}
                      </p>
                      <div className="grid gap-2">
                        {["09:00", "10:30", "14:00"].map((time) => (
                          <button
                            key={`${period}-${time}`}
                            type="button"
                            className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold"
                            onClick={() => selectColorTarget("brandColor")}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </main>
          ) : null}

          {activePage === "login" ? (
            <main className="flex min-h-[650px] items-center justify-center px-4 py-8 text-white">
              <div className="surface-card-strong w-full max-w-md rounded-[32px] p-8 shadow-2xl">
                <div className="mb-8 text-center">
                  <p className="mb-2 text-xs uppercase tracking-[0.35em] text-[var(--brand-strong)]">
                    Login
                  </p>
                  <h1 className="text-4xl font-bold">Entrar</h1>
                  <p className="mt-3 text-sm text-zinc-300">
                    Entre para acessar sua conta e acompanhar seus horarios.
                  </p>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-200">
                      Email
                    </label>
                    <div className="h-14 rounded-2xl border border-white/10 bg-black/20" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-200">
                      Senha
                    </label>
                    <div className="h-14 rounded-2xl border border-white/10 bg-black/20" />
                    <p className="mt-3 text-right text-sm font-semibold text-[var(--brand-strong)]">
                      Esqueceu a senha?
                    </p>
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-[var(--brand)] px-4 py-4 text-sm font-black text-white"
                    onClick={() => selectColorTarget("brandColor")}
                  >
                    Entrar
                  </button>
                </div>
                <p className="mt-6 text-center text-sm text-zinc-300">
                  Ainda nao tem conta?{" "}
                  <span className="font-semibold text-[var(--brand-strong)]">
                    Criar conta
                  </span>
                </p>
              </div>
            </main>
          ) : null}

          {activePage === "customer" ? (
            <main className="page-shell max-w-5xl px-5 pb-8 pt-6 text-white">
              <div>
                <h1 className="break-words text-4xl font-bold text-white">
                  Meus agendamentos
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Veja seus horarios e acompanhe o status de cada atendimento em uma pagina so.
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    className="rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-white"
                    onClick={() => selectColorTarget("brandColor")}
                  >
                    Novo agendamento
                  </button>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {["09:00", "14:30", "18:00"].map((time, index) => (
                  <article
                    key={time}
                    className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-black/25 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.2)]"
                  >
                    <span className="absolute right-4 top-4 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-100">
                      Confirmado
                    </span>
                    <div className="min-w-0 pr-28">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                        #{index + 1024}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        Qui, 28/05
                      </p>
                      <p className="text-2xl font-bold text-white">{time}</p>
                      <p className="mt-2 truncate text-base font-semibold text-white">
                        Alex
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-400">
                        Corte masculino
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">40 min - R$ 45,00</p>
                    </div>
                  </article>
                ))}
              </div>
            </main>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Edicao selecionada
            </p>
            <p className="mt-2 text-sm font-black text-white">
              {fieldLabels[activeField] || "Elemento"}
            </p>
          </div>
          <span
            className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"
          >
            {activePage}
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-xs font-bold text-slate-300">
            Cor principal e botoes
            <input
              type="color"
              value={values.brandColor}
              onChange={(event) => updateColor("brandColor", event.target.value)}
              className="h-10 w-full rounded-lg border border-white/10 bg-black/30 p-1"
            />
          </label>
          <label className="grid gap-2 text-xs font-bold text-slate-300">
            Fundo da pagina
            <input
              type="color"
              value={values.backgroundColor}
              onChange={(event) => updateColor("backgroundColor", event.target.value)}
              className="h-10 w-full rounded-lg border border-white/10 bg-black/30 p-1"
            />
          </label>
          <label className="grid gap-2 text-xs font-bold text-slate-300">
            Cor da letra
            <input
              type="color"
              value={values.textColor}
              onChange={(event) => updateColor("textColor", event.target.value)}
              className="h-10 w-full rounded-lg border border-white/10 bg-black/30 p-1"
            />
          </label>
          <label className="grid gap-2 text-xs font-bold text-slate-300">
            Fonte
            <select
              value={values.fontFamily}
              onChange={(event) => updateFont(event.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
            >
              <option value="modern">Moderna limpa</option>
              <option value="display">Marcante</option>
              <option value="system">Sistema</option>
              <option value="serif">Classica</option>
            </select>
          </label>
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
