"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, type ReactNode } from "react";
import { DEFAULT_PUBLIC_HOME_CONTENT } from "@/lib/shopHomeContent";
import WrSitePreview from "../_components/WrSitePreview";

type NewTenantFormProps = {
  creationEnabled: boolean;
  initialError: string | null;
};

const inputClass =
  "h-11 rounded-xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:bg-slate-950";
const textareaClass =
  "resize-y rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:bg-slate-950";

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-black text-white">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm ${className}`}>
      <span className="font-semibold text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/10 ${className}`}
    >
      {children}
    </section>
  );
}

export default function NewTenantForm({ creationEnabled, initialError }: NewTenantFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brandColor, setBrandColor] = useState("#14b8a6");
  const [backgroundColor, setBackgroundColor] = useState("#05070b");
  const [textColor, setTextColor] = useState("#ffffff");
  const formId = "wr-new-tenant-form";

  async function submitTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!creationEnabled || isSubmitting) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/wr/tenants/novo/submit", {
        method: "POST",
        body: new FormData(event.currentTarget),
        headers: {
          "X-WR-Fetch": "1",
        },
      });
      const body = await response.json();

      if (!response.ok || !body.ok) {
        setErrorMessage(body.error || "Nao foi possivel criar a barbearia.");
        return;
      }

      router.replace(body.redirectTo || "/wr/tenants");
      router.refresh();
    } catch {
      setErrorMessage("Falha de conexao ao criar a barbearia.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {errorMessage ? (
        <div className="mb-5 rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <form
        id={formId}
        action="/wr/tenants/novo/submit"
        method="post"
        onSubmit={submitTenant}
        className="grid gap-5"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px] xl:items-start">
        <fieldset disabled={!creationEnabled || isSubmitting} className="grid gap-6 disabled:opacity-55">
          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:items-start">
            <Panel className="grid gap-5">
              <SectionHeader
                eyebrow="Base"
                title="Dados principais"
                description="Identifique a barbearia e o dominio que sera usado pelo cliente."
              />
              <div className="grid gap-4 lg:grid-cols-3">
                <Field label="Nome da barbearia" className="lg:col-span-2">
              <input
                name="name"
                required
                className={inputClass}
                placeholder="Black Zone"
              />
                </Field>
                <Field label="Slug">
              <input
                name="slug"
                className={inputClass}
                placeholder="black-zone"
              />
                </Field>
                <Field label="Dominio principal" className="lg:col-span-3">
            <input
              name="domain"
              className={inputClass}
              placeholder="blackzone.com.br"
            />
                </Field>
              </div>
            </Panel>

            <Panel className="grid gap-5">
              <SectionHeader
                eyebrow="Acesso"
                title="Admin inicial"
                description="Usuario que recebe o primeiro acesso ao painel da barbearia."
              />
              <div className="grid gap-4">
                <Field label="Admin nome">
                  <input
                    name="adminName"
                    required
                    className={inputClass}
                    placeholder="Admin Black Zone"
                  />
                </Field>
                <Field label="Admin e-mail">
                  <input
                    name="adminEmail"
                    type="email"
                    required
                    className={inputClass}
                    placeholder="admin@blackzone.com.br"
                  />
                </Field>
                <Field label="Senha inicial">
                  <input
                    name="adminPassword"
                    type="password"
                    required
                    className={inputClass}
                    placeholder="Minimo 8, letra e numero"
                  />
                </Field>
              </div>
            </Panel>
          </div>

          <Panel className="grid gap-5">
            <SectionHeader
              eyebrow="Identidade"
              title="Marca, cores e contato"
              description="Essas escolhas aparecem no site publico, nos botoes e nos previews das telas."
            />
            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
              <div className="grid gap-4 md:grid-cols-2">
              <Field label="Logo" className="md:col-span-2">
                <input
                  name="logoPath"
                  className={inputClass}
                  placeholder="/uploads/logo-cliente.png ou https://..."
                />
              </Field>

              <Field label="Cor principal">
                <div className="grid grid-cols-[3rem_1fr] gap-3">
                  <input
                    name="brandColor"
                    type="color"
                    value={brandColor}
                    onChange={(event) => setBrandColor(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 p-1"
                  />
                  <input
                    value={brandColor}
                    readOnly
                    className={inputClass}
                  />
                </div>
              </Field>
              <Field label="Cor de fundo">
                <div className="grid grid-cols-[3rem_1fr] gap-3">
                  <input
                    name="backgroundColor"
                    type="color"
                    value={backgroundColor}
                    onChange={(event) => setBackgroundColor(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 p-1"
                  />
                  <input
                    value={backgroundColor}
                    readOnly
                    className={inputClass}
                  />
                </div>
              </Field>
              <Field label="Cor da letra">
                <div className="grid grid-cols-[3rem_1fr] gap-3">
                  <input
                    name="textColor"
                    type="color"
                    value={textColor}
                    onChange={(event) => setTextColor(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 p-1"
                  />
                  <input
                    value={textColor}
                    readOnly
                    className={inputClass}
                  />
                </div>
              </Field>
              <Field label="Fonte do site">
                <select
                  name="fontFamily"
                  defaultValue="modern"
                  className={inputClass}
                >
                  <option value="modern">Moderna limpa</option>
                  <option value="display">Marcante</option>
                  <option value="system">Sistema</option>
                  <option value="serif">Classica</option>
                </select>
              </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="WhatsApp">
                  <input
                    name="whatsappNumber"
                    className={inputClass}
                    placeholder="5511999999999"
                  />
                </Field>
                <Field label="Instagram">
                  <input
                    name="instagramUrl"
                    className={inputClass}
                    placeholder="https://instagram.com/barbearia"
                  />
                </Field>
                <Field label="Endereco">
                  <input
                    name="addressLine"
                    className={inputClass}
                    placeholder="Rua, numero, cidade"
                  />
                </Field>
                <Field label="Horario">
                  <input
                    name="businessHours"
                    className={inputClass}
                    placeholder="Seg a sab, 9h as 19h"
                  />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel className="grid gap-5">
            <SectionHeader
              eyebrow="Site"
              title="Conteudo da pagina publica"
              description="Textos exibidos na home e nos resultados de busca."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Titulo Google">
                <input
                  name="metadataTitle"
                  className={inputClass}
                  placeholder="Nome da barbearia"
                />
              </Field>
              <Field label="Descricao Google">
                <textarea
                  name="metadataDescription"
                  rows={2}
                  className={textareaClass}
                  placeholder="Descricao curta para aparecer no Google"
                />
              </Field>
              <Field label="Texto pequeno acima do titulo">
                <input
                  name="heroEyebrow"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.heroEyebrow}
                  className={inputClass}
                />
              </Field>
              <Field label="Titulo principal">
                <input
                  name="heroTitle"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.heroTitle}
                  className={inputClass}
                />
              </Field>
              <Field label="Texto principal" className="md:col-span-2">
                <textarea
                  name="heroSubtitle"
                  rows={3}
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.heroSubtitle}
                  className={textareaClass}
                />
              </Field>
              <Field label="Botao principal">
                <input
                  name="primaryButtonLabel"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.primaryButtonLabel}
                  className={inputClass}
                />
              </Field>
              <Field label="Botao secundario">
                <input
                  name="secondaryButtonLabel"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.secondaryButtonLabel}
                  className={inputClass}
                />
              </Field>
              <Field label="Card 1 titulo">
                <input
                  name="infoOneLabel"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.infoOneLabel}
                  className={inputClass}
                />
              </Field>
              <Field label="Card 1 texto">
                <input
                  name="infoOneValue"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.infoOneValue}
                  className={inputClass}
                />
              </Field>
              <Field label="Card 2 titulo">
                <input
                  name="infoTwoLabel"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.infoTwoLabel}
                  className={inputClass}
                />
              </Field>
              <Field label="Card 2 texto">
                <input
                  name="infoTwoValue"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.infoTwoValue}
                  className={inputClass}
                />
              </Field>
              <Field label="Card 3 titulo">
                <input
                  name="infoThreeLabel"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.infoThreeLabel}
                  className={inputClass}
                />
              </Field>
              <Field label="Card 3 texto">
                <input
                  name="infoThreeValue"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.infoThreeValue}
                  className={inputClass}
                />
              </Field>
              <input type="hidden" name="primaryButtonHref" value="/agendar" />
              <input type="hidden" name="secondaryButtonHref" value="/servicos" />
              <input type="hidden" name="showServices" value="off" />
              <input type="hidden" name="showBarbers" value="off" />
              <input type="hidden" name="showReviews" value="on" />
              <input type="hidden" name="showAbout" value="off" />
              <input type="hidden" name="showContact" value="off" />
              <input type="hidden" name="servicesTitle" value={DEFAULT_PUBLIC_HOME_CONTENT.servicesTitle} />
              <input type="hidden" name="barbersTitle" value={DEFAULT_PUBLIC_HOME_CONTENT.barbersTitle} />
              <input type="hidden" name="productsTitle" value={DEFAULT_PUBLIC_HOME_CONTENT.productsTitle} />
              <input type="hidden" name="reviewsTitle" value={DEFAULT_PUBLIC_HOME_CONTENT.reviewsTitle} />
              <input type="hidden" name="aboutTitle" value={DEFAULT_PUBLIC_HOME_CONTENT.aboutTitle} />
              <input type="hidden" name="contactTitle" value={DEFAULT_PUBLIC_HOME_CONTENT.contactTitle} />
              <input type="hidden" name="footerText" value={DEFAULT_PUBLIC_HOME_CONTENT.footerText} />
            </div>
          </Panel>

          <Panel className="grid gap-5">
            <SectionHeader
              eyebrow="Operacao"
              title="Servico inicial"
              description="Cria um primeiro servico para o tenant ja sair testavel."
            />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Servico inicial">
              <input
                name="serviceName"
                className={inputClass}
                placeholder="Corte"
              />
            </Field>
            <Field label="Preco">
              <input
                name="servicePrice"
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                placeholder="45"
              />
            </Field>
            <Field label="Duracao min.">
              <input
                name="serviceDuration"
                type="number"
                min="5"
                step="5"
                className={inputClass}
                placeholder="40"
              />
            </Field>
          </div>
          </Panel>
        </fieldset>

        <WrSitePreview
          formId={formId}
          initialValues={{
            brandColor,
            backgroundColor,
            textColor,
            fontFamily: "modern",
            ...DEFAULT_PUBLIC_HOME_CONTENT,
          }}
        />
        </div>

        <div className="sticky bottom-4 z-10 rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-400">
              Revise os dados e o preview antes de criar o tenant.
            </p>
            <button
              type="submit"
              disabled={!creationEnabled || isSubmitting}
              className="min-h-11 rounded-xl bg-cyan-400 px-6 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isSubmitting ? "Criando..." : "Criar barbearia"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
