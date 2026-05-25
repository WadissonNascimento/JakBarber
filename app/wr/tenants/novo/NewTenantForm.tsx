"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type NewTenantFormProps = {
  creationEnabled: boolean;
  initialError: string | null;
};

export default function NewTenantForm({ creationEnabled, initialError }: NewTenantFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brandColor, setBrandColor] = useState("#14b8a6");

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
        action="/wr/tenants/novo/submit"
        method="post"
        onSubmit={submitTenant}
        className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.06] p-5"
      >
        <fieldset disabled={!creationEnabled || isSubmitting} className="grid gap-5 disabled:opacity-55">
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

          <section className="grid gap-4 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_1fr]">
            <div className="grid gap-4">
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
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Preview
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  Aa
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
        </fieldset>

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
