"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { TENANT_DESIGN_TEMPLATES, TENANT_FONT_STYLES } from "@/lib/tenantDesign";
import { TENANT_PLANS } from "@/lib/tenantPlans";

type NewTenantFormProps = {
  creationEnabled: boolean;
  initialError: string | null;
};

const inputClass =
  "min-h-12 w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70 focus:bg-black/45 sm:text-sm";
const sectionClass =
  "grid w-full min-w-0 gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
const sectionEyebrowClass =
  "text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200";
const fieldClass = "grid min-w-0 gap-2 text-sm";

async function parseSubmitResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const responseText = await response.text().catch(() => "");

  if (response.redirected || response.url.includes("/wr/login")) {
    return {
      ok: false,
      error: "Sessao do painel expirada. Entre no painel WR novamente e tente criar a barbearia.",
    };
  }

  return {
    ok: false,
    error: response.ok
      ? "Resposta inesperada ao criar a barbearia. Recarregue o painel e tente novamente."
      : `Erro do servidor (${response.status}) ao criar a barbearia.${
          responseText ? " Veja os logs do PM2 para detalhes." : ""
        }`,
  };
}

export default function NewTenantForm({ creationEnabled, initialError }: NewTenantFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brandColor, setBrandColor] = useState("#14b8a6");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedLogoName, setSelectedLogoName] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    setSelectedLogoName(file?.name || null);
    setLogoPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return file ? URL.createObjectURL(file) : null;
    });
  }

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
      const body = await parseSubmitResponse(response);

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
        action="/wr/tenants/novo/submit"
        method="post"
        encType="multipart/form-data"
        onSubmit={submitTenant}
        className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/75 shadow-[0_28px_110px_rgba(0,0,0,0.45)] ring-1 ring-cyan-300/10 sm:rounded-[2rem]"
      >
        <fieldset disabled={!creationEnabled || isSubmitting} className="disabled:opacity-55">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4 sm:p-5 md:p-6">
            <p className={sectionEyebrowClass}>Setup premium</p>
            <div className="mt-2 flex min-w-0 flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-2xl font-black text-white">Nova barbearia</h2>
                <p className="mt-1 break-words text-sm text-slate-400">
                  Crie o tenant com marca, visual, plano e primeiro acesso.
                </p>
              </div>
              <span className="max-w-full rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-center text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                Criação guiada
              </span>
            </div>
          </div>

          <div className="grid min-w-0 gap-5 p-3 sm:p-5 md:p-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="grid min-w-0 content-start gap-5">
              <section className={sectionClass}>
                <div>
                  <p className={sectionEyebrowClass}>Identidade</p>
                  <h3 className="mt-1 text-lg font-black text-white">Dados públicos</h3>
                </div>
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Nome da barbearia</span>
                    <input name="name" required className={inputClass} placeholder="Black Zone" />
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Slug</span>
                    <input name="slug" className={inputClass} placeholder="black-zone" />
                  </label>
                </div>
                <label className={fieldClass}>
                  <span className="font-semibold text-slate-200">Dominio principal</span>
                  <input name="domain" className={inputClass} placeholder="blackzone.com.br" />
                </label>
              </section>

              <section className={sectionClass}>
                <div>
                  <p className={sectionEyebrowClass}>Acesso</p>
                  <h3 className="mt-1 text-lg font-black text-white">Admin inicial</h3>
                </div>
                <div className="grid min-w-0 gap-4 lg:grid-cols-3">
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Nome</span>
                    <input
                      name="adminName"
                      required
                      className={inputClass}
                      placeholder="Admin Black Zone"
                    />
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">E-mail</span>
                    <input
                      name="adminEmail"
                      type="email"
                      required
                      className={inputClass}
                      placeholder="admin@blackzone.com.br"
                    />
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Senha inicial</span>
                    <input
                      name="adminPassword"
                      type="password"
                      required
                      className={inputClass}
                      placeholder="Minimo 8, letra e numero"
                    />
                  </label>
                </div>
              </section>

              <section className={sectionClass}>
                <div>
                  <p className={sectionEyebrowClass}>Operação</p>
                  <h3 className="mt-1 text-lg font-black text-white">Plano e serviço base</h3>
                </div>
                <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Plano</span>
                    <select name="planCode" defaultValue="custom" className={inputClass}>
                      {TENANT_PLANS.map((plan) => (
                        <option key={plan.code} value={plan.code}>
                          {plan.name}
                          {plan.barberLimit ? ` - ${plan.barberLimit} barbeiros` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Limite de barbeiros</span>
                    <input
                      name="barberLimit"
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      defaultValue="3"
                      className={inputClass}
                      placeholder="3"
                    />
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Serviço inicial</span>
                    <input name="serviceName" className={inputClass} placeholder="Corte" />
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Preço</span>
                    <input
                      name="servicePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      placeholder="45"
                    />
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Duração min.</span>
                    <input
                      name="serviceDuration"
                      type="number"
                      min="5"
                      step="5"
                      className={inputClass}
                      placeholder="40"
                    />
                  </label>
                </div>
              </section>
            </div>

            <div className="grid min-w-0 content-start gap-5">
              <section className="grid w-full min-w-0 gap-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div>
                  <p className={sectionEyebrowClass}>Marca</p>
                  <h3 className="mt-1 text-lg font-black text-white">Logo do cliente</h3>
                </div>
                <label className={fieldClass}>
                  <span className="font-semibold text-slate-200">Carregar arquivo</span>
                  <div className="grid min-w-0 gap-3 rounded-2xl border border-dashed border-cyan-300/25 bg-black/25 p-3 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:p-4">
                    <div
                      className="flex aspect-square items-center justify-center rounded-2xl border border-white/10 bg-slate-950 bg-contain bg-center bg-no-repeat text-lg font-black text-white"
                      style={logoPreview ? { backgroundImage: `url(${logoPreview})` } : undefined}
                    >
                      {logoPreview ? <span className="sr-only">Logo selecionada</span> : "Logo"}
                    </div>
                    <div className="grid min-w-0 content-center gap-2">
                      <input
                        name="logoFile"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
                        onChange={handleLogoChange}
                        className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-base text-white file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-950 sm:px-4 sm:text-sm"
                      />
                      <p className="break-words text-xs text-slate-500">
                        {selectedLogoName || "PNG, JPG, WEBP ou HEIC ate 5MB."}
                      </p>
                    </div>
                  </div>
                </label>
                <label className={fieldClass}>
                  <span className="font-semibold text-slate-200">Ou usar URL/caminho</span>
                  <input
                    name="logoPath"
                    className={inputClass}
                    placeholder="/uploads/logo-cliente.png ou https://..."
                  />
                </label>
              </section>

              <section className={sectionClass}>
                <div>
                  <p className={sectionEyebrowClass}>Design</p>
                  <h3 className="mt-1 text-lg font-black text-white">Visual inicial</h3>
                </div>
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Cor principal</span>
                    <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3">
                      <input
                        name="brandColor"
                        type="color"
                        value={brandColor}
                        onChange={(event) => setBrandColor(event.target.value)}
                        className="h-12 w-full rounded-xl border border-white/10 bg-black/30 p-1"
                      />
                      <input value={brandColor} readOnly className={inputClass} />
                    </div>
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Template</span>
                    <select name="designTemplate" defaultValue="dark-premium" className={inputClass}>
                      {TENANT_DESIGN_TEMPLATES.map((template) => (
                        <option key={template.code} value={template.code}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Fonte</span>
                    <select name="fontStyle" defaultValue="modern" className={inputClass}>
                      {TENANT_FONT_STYLES.map((font) => (
                        <option key={font.code} value={font.code}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Cor de fundo</span>
                    <input
                      name="backgroundColor"
                      type="color"
                      defaultValue="#030712"
                      className="h-12 w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-2"
                    />
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Cor da letra</span>
                    <input
                      name="textColor"
                      type="color"
                      defaultValue="#f6f7fb"
                      className="h-12 w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-2"
                    />
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Favicon</span>
                    <input
                      name="faviconPath"
                      className={inputClass}
                      placeholder="/favicon.ico ou https://..."
                    />
                  </label>
                  <label className={`${fieldClass} md:col-span-2`}>
                    <span className="font-semibold text-slate-200">Imagem principal</span>
                    <input
                      name="heroImageUrl"
                      className={inputClass}
                      placeholder="/uploads/hero.webp ou https://..."
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Preview da marca
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-contain bg-center bg-no-repeat text-sm font-black text-white"
                      style={
                        logoPreview
                          ? { backgroundImage: `url(${logoPreview})` }
                          : { backgroundColor: brandColor }
                      }
                    >
                      {logoPreview ? <span className="sr-only">Logo selecionada</span> : "Aa"}
                    </span>
                    <div>
                      <p className="font-black text-white">Nome da barbearia</p>
                      <p className="text-xs text-slate-400">Tema aplicado no tenant</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-4 min-h-11 w-full rounded-xl px-4 py-2 text-sm font-black text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    Agendar horario
                  </button>
                </div>
              </section>

              <section className={sectionClass}>
                <div>
                  <p className={sectionEyebrowClass}>Home</p>
                  <h3 className="mt-1 text-lg font-black text-white">Conteúdo inicial</h3>
                </div>
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Texto pequeno</span>
                    <input
                      name="heroEyebrow"
                      defaultValue="Barbearia premium"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Título principal</span>
                    <input
                      name="heroTitle"
                      defaultValue="Seu estilo comeca aqui."
                      className={inputClass}
                    />
                  </label>
                  <label className={`${fieldClass} md:col-span-2`}>
                    <span className="font-semibold text-slate-200">Subtítulo</span>
                    <textarea
                      name="heroSubtitle"
                      defaultValue="Agende seu horario com praticidade e tenha uma experiencia premium."
                      className={`${inputClass} min-h-24`}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Botão secundário</span>
                    <input name="secondaryCtaLabel" defaultValue="Ver servicos" className={inputClass} />
                  </label>
                  <label className={fieldClass}>
                    <span className="font-semibold text-slate-200">Link secundário</span>
                    <input name="secondaryCtaHref" defaultValue="/servicos" className={inputClass} />
                  </label>
                </div>
              </section>
            </div>
          </div>
        </fieldset>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/20 p-4 sm:p-5 md:p-6">
          <p className="min-w-0 max-w-full break-words text-xs text-slate-500">
            Revise os dados antes de criar. A barbearia nasce isolada e pronta para configurar SSL.
          </p>
          <button
            type="submit"
            disabled={!creationEnabled || isSubmitting}
            className="min-h-12 w-full rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 shadow-[0_16px_40px_rgba(34,211,238,0.2)] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
          >
            {isSubmitting ? "Criando..." : "Criar barbearia"}
          </button>
        </div>
      </form>
    </>
  );
}
