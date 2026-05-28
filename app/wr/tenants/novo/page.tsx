import Link from "next/link";
import { isWrTenantCreationEnabled, requireWrAdminSession } from "@/lib/wrSession";
import WrShell from "../../WrShell";
import NewTenantForm from "./NewTenantForm";

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
      <div className="mb-5 w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.28)] sm:mb-6 sm:rounded-[2rem] sm:p-6">
        <Link href="/wr/tenants" className="text-sm font-bold text-cyan-200 hover:underline">
          Voltar para barbearias
        </Link>
        <div className="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
              Provisionamento
            </p>
            <h1 className="mt-2 break-words text-3xl font-black sm:text-4xl">
              Nova barbearia
            </h1>
            <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-slate-300 sm:leading-7">
              Crie o tenant, o admin inicial, um servico base e a identidade visual
              que diferencia cada cliente.
            </p>
          </div>
          <span className={`max-w-full rounded-full px-3 py-2 text-center text-xs font-black uppercase tracking-[0.14em] ${
            creationEnabled
              ? "bg-emerald-400/15 text-emerald-100"
              : "bg-amber-400/15 text-amber-100"
          }`}>
            {creationEnabled ? "Criacao liberada" : "Criacao bloqueada"}
          </span>
        </div>
      </div>

      {!creationEnabled ? (
        <div className="mb-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
          Criacao bloqueada neste ambiente. Defina WR_TENANT_CREATION_ENABLED=1
          apenas quando for realmente criar barbearia em producao.
        </div>
      ) : null}

      <NewTenantForm creationEnabled={creationEnabled} initialError={errorMessage} />
    </WrShell>
  );
}
