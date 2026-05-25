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

      <NewTenantForm creationEnabled={creationEnabled} initialError={errorMessage} />
    </WrShell>
  );
}
