import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { WR_TECH_HEADER_LOGO_PATH } from "@/lib/wrTechInstitutional";

export default function WrShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName?: string | null;
}) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#03060d] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(20,184,166,0.12),transparent_28%),linear-gradient(180deg,#03060d_0%,#070b13_52%,#03060d_100%)]" />
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050914]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-4 sm:gap-4 sm:px-4">
          <Link href="/wr" className="flex min-w-0 items-center gap-4">
            <span className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
              <Image
                src={WR_TECH_HEADER_LOGO_PATH}
                alt="WR Tech Solutions"
                width={220}
                height={69}
                priority
                className="h-auto w-[142px] rounded-lg object-cover"
              />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                Painel WR
              </span>
              <span className="mt-1 block truncate text-sm text-slate-400">
                Operação multi-tenant
              </span>
            </span>
          </Link>

          <nav className="flex min-w-0 shrink-0 items-center gap-2 text-sm">
            <Link
              href="/wr"
              className="hidden rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-semibold text-slate-200 transition hover:border-cyan-300/50 hover:text-white md:inline-flex"
            >
              Visão geral
            </Link>
            <Link
              href="/wr/tenants"
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 font-semibold text-slate-200 transition hover:border-cyan-300/50 hover:text-white sm:px-4"
            >
              Barbearias
            </Link>
            <span className="hidden rounded-full border border-white/10 bg-black/20 px-3 py-2 text-slate-400 sm:inline">
              {userName || "WR Admin"}
            </span>
            <div className="hidden sm:block">
              <LogoutButton />
            </div>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl min-w-0 px-3 py-6 sm:px-4 sm:py-10">
        {children}
      </div>
    </main>
  );
}
