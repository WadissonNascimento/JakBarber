import Image from "next/image";
import { WR_TECH_HEADER_LOGO_PATH } from "@/lib/wrTechInstitutional";

export default function WrTechAppPlaceholder() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070b] px-4 py-10 text-white">
      <section className="w-full max-w-xl rounded-lg border border-white/10 bg-white/[0.06] p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.35)] sm:p-8">
        <Image
          src={WR_TECH_HEADER_LOGO_PATH}
          alt="WR Tech Solutions"
          width={360}
          height={113}
          priority
          className="mx-auto h-auto w-full max-w-[260px] rounded-lg object-cover object-center"
        />
        <p className="mt-7 text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
          app.wrtechsolutions.tech
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
          Ambiente da WR Tech Solutions
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-300 sm:text-base">
          Este dominio e reservado para a plataforma. Acesse a barbearia pelo
          dominio oficial dela.
        </p>
      </section>
    </main>
  );
}
