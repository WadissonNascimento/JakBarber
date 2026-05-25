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
