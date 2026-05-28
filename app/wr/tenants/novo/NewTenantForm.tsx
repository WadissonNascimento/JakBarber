"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { DEFAULT_PUBLIC_HOME_CONTENT } from "@/lib/shopHomeContent";
import WrSitePreview from "../_components/WrSitePreview";

type NewTenantFormProps = {
  creationEnabled: boolean;
  initialError: string | null;
};

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
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <fieldset disabled={!creationEnabled || isSubmitting} className="grid gap-5 disabled:opacity-55">
          <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                Base
              </p>
              <h2 className="mt-1 text-lg font-black">Dados da barbearia</h2>
            </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Nome da barbearia</span>
              <input
                name="name"
                required
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                placeholder="Black Zone"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Slug</span>
              <input
                name="slug"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                placeholder="black-zone"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Dominio principal</span>
            <input
              name="domain"
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
              placeholder="blackzone.com.br"
            />
          </label>
          </section>

          <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                Identidade
              </p>
              <h2 className="mt-1 text-lg font-black">Marca e contato</h2>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Logo</span>
                <input
                  name="logoPath"
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                  placeholder="/uploads/logo-cliente.png ou https://..."
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Cor principal</span>
                <div className="grid grid-cols-[3.5rem_1fr] gap-3">
                  <input
                    name="brandColor"
                    type="color"
                    value={brandColor}
                    onChange={(event) => setBrandColor(event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/30 p-1"
                  />
                  <input
                    value={brandColor}
                    readOnly
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                  />
                </div>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Cor de fundo</span>
                <div className="grid grid-cols-[3.5rem_1fr] gap-3">
                  <input
                    name="backgroundColor"
                    type="color"
                    value={backgroundColor}
                    onChange={(event) => setBackgroundColor(event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/30 p-1"
                  />
                  <input
                    value={backgroundColor}
                    readOnly
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                  />
                </div>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Cor da letra</span>
                <div className="grid grid-cols-[3.5rem_1fr] gap-3">
                  <input
                    name="textColor"
                    type="color"
                    value={textColor}
                    onChange={(event) => setTextColor(event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/30 p-1"
                  />
                  <input
                    value={textColor}
                    readOnly
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                  />
                </div>
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-semibold text-slate-200">Fonte do site</span>
                <select
                  name="fontFamily"
                  defaultValue="modern"
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                >
                  <option value="modern">Moderna limpa</option>
                  <option value="display">Marcante</option>
                  <option value="system">Sistema</option>
                  <option value="serif">Classica</option>
                </select>
              </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-slate-200">WhatsApp</span>
                  <input
                    name="whatsappNumber"
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                    placeholder="5511999999999"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-slate-200">Instagram</span>
                  <input
                    name="instagramUrl"
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                    placeholder="https://instagram.com/barbearia"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-slate-200">Endereco</span>
                  <input
                    name="addressLine"
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                    placeholder="Rua, numero, cidade"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-slate-200">Horario</span>
                  <input
                    name="businessHours"
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                    placeholder="Seg a sab, 9h as 19h"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                Site
              </p>
              <h2 className="mt-1 text-lg font-black">Textos e preview</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Titulo Google</span>
                <input
                  name="metadataTitle"
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                  placeholder="Nome da barbearia"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Descricao Google</span>
                <textarea
                  name="metadataDescription"
                  rows={2}
                  className="resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                  placeholder="Descricao curta para aparecer no Google"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">
                  Texto pequeno acima do titulo
                </span>
                <input
                  name="heroEyebrow"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.heroEyebrow}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Titulo principal</span>
                <input
                  name="heroTitle"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.heroTitle}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-semibold text-slate-200">Texto principal</span>
                <textarea
                  name="heroSubtitle"
                  rows={3}
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.heroSubtitle}
                  className="resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Botao principal</span>
                <input
                  name="primaryButtonLabel"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.primaryButtonLabel}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Botao secundario</span>
                <input
                  name="secondaryButtonLabel"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.secondaryButtonLabel}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Card 1 titulo</span>
                <input
                  name="infoOneLabel"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.infoOneLabel}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Card 1 texto</span>
                <input
                  name="infoOneValue"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.infoOneValue}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Card 2 titulo</span>
                <input
                  name="infoTwoLabel"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.infoTwoLabel}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Card 2 texto</span>
                <input
                  name="infoTwoValue"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.infoTwoValue}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Card 3 titulo</span>
                <input
                  name="infoThreeLabel"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.infoThreeLabel}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-200">Card 3 texto</span>
                <input
                  name="infoThreeValue"
                  defaultValue={DEFAULT_PUBLIC_HOME_CONTENT.infoThreeValue}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                />
              </label>
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
          </section>

          <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                Acesso
              </p>
              <h2 className="mt-1 text-lg font-black">Admin inicial</h2>
            </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Admin nome</span>
              <input
                name="adminName"
                required
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                placeholder="Admin Black Zone"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Admin e-mail</span>
              <input
                name="adminEmail"
                type="email"
                required
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                placeholder="admin@blackzone.com.br"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Senha inicial</span>
              <input
                name="adminPassword"
                type="password"
                required
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                placeholder="Minimo 8, letra e numero"
              />
            </label>
          </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                Operacao
              </p>
              <h2 className="mt-1 text-lg font-black">Servico inicial</h2>
            </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Servico inicial</span>
              <input
                name="serviceName"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                placeholder="Corte"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Preco</span>
              <input
                name="servicePrice"
                type="number"
                min="0"
                step="0.01"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                placeholder="45"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Duracao min.</span>
              <input
                name="serviceDuration"
                type="number"
                min="5"
                step="5"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
                placeholder="40"
              />
            </label>
          </div>
          </section>
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

        <button
          type="submit"
          disabled={!creationEnabled || isSubmitting}
          className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isSubmitting ? "Criando..." : "Criar barbearia"}
        </button>
      </form>
    </>
  );
}
