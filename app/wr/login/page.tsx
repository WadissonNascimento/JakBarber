import Image from "next/image";
import AuthFormMessage from "@/components/AuthFormMessage";
import ReliableSubmitButton from "@/components/ReliableSubmitButton";
import { WR_TECH_HEADER_LOGO_PATH } from "@/lib/wrTechInstitutional";

export default async function WrLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
  }>;
}) {
  const errorMessage = (await searchParams)?.error || null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070b] px-4 py-10 text-white">
      <form
        action="/wr/login/submit"
        method="post"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.35)]"
      >
        <Image
          src={WR_TECH_HEADER_LOGO_PATH}
          alt="WR Tech Solutions"
          width={360}
          height={113}
          priority
          className="mx-auto h-auto w-full max-w-[240px] rounded-lg object-cover"
        />
        <p className="mt-7 text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
          app.wrtechsolutions.tech
        </p>
        <h1 className="mt-3 text-3xl font-black">Painel interno WR</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Acesso restrito aos administradores da plataforma.
        </p>

        <div className="mt-5">
          <AuthFormMessage message={errorMessage} />
        </div>

        <div className="mt-5 space-y-4">
          <input
            name="email"
            type="email"
            placeholder="E-mail WR"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Senha"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
            required
          />
        </div>

        <div className="mt-5">
          <ReliableSubmitButton idleText="Entrar" loadingText="Entrando..." />
        </div>
      </form>
    </main>
  );
}
