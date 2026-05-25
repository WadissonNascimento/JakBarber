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
    <main className="min-h-screen bg-[#05070b] text-white">
      <header className="border-b border-white/10 bg-white/[0.04]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/wr" className="flex items-center gap-3">
            <Image
              src={WR_TECH_HEADER_LOGO_PATH}
              alt="WR Tech Solutions"
              width={220}
              height={69}
              priority
              className="h-auto w-[150px] rounded-md object-cover"
            />
            <span className="hidden text-xs uppercase tracking-[0.18em] text-cyan-200 sm:inline">
              Painel WR
            </span>
          </Link>

          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/wr/tenants"
              className="rounded-full border border-white/10 px-4 py-2 text-slate-200 hover:border-cyan-300/50 hover:text-white"
            >
              Barbearias
            </Link>
            <span className="hidden text-slate-500 sm:inline">
              {userName || "WR Admin"}
            </span>
            <div className="hidden sm:block">
              <LogoutButton />
            </div>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </main>
  );
}
