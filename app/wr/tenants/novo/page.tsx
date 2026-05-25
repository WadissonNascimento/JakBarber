import Link from "next/link";
import { isWrTenantCreationEnabled, requireWrAdminSession } from "@/lib/wrSession";
import WrShell from "../../WrShell";

export const dynamic = "force-dynamic";

export default async function NewWrTenantPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
  }>;
}) {
  const [{ user }, creationEnabled, params] = await Promise.all([
    requireWrAdminSession(),
    isWrTenantCreationEnabled(),
    searchParams,
  ]);
  const errorMessage = params?.error || null;

  return (
    <WrShell userName={user.name}>
      <div className="mb-6">
        <Link href="/wr/tenants" className="text-sm text-cyan-200 hover:underline">
          Voltar para barbearias
        </Link>
        <h1 className="mt-3 text-3xl font-black">Nova barbearia</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
          Crie o tenant, o admin inicial e um servico base. Em producao, esta
          acao exige liberacao explicita por env.
        </p>
      </div>

      {!creationEnabled ? (
        <div className="mb-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
          Criacao bloqueada neste ambiente. Defina WR_TENANT_CREATION_ENABLED=1
          apenas quando for realmente criar barbearia em producao.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-5 rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <form
        action="/wr/tenants/novo/submit"
        method="post"
        className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.06] p-5"
      >
        <fieldset disabled={!creationEnabled} className="grid gap-5 disabled:opacity-55">
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
          disabled={!creationEnabled}
          className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Criar barbearia
        </button>
      </form>
    </WrShell>
  );
}
