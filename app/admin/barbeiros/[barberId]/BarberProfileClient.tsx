"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import BarberPhotoUploader from "@/components/BarberPhotoUploader";
import BackLink from "@/components/ui/BackLink";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatBrazilianPhone } from "@/lib/phone";
import { formatCurrency } from "@/lib/utils";
import { updateBarberPhotoAction } from "../actions";

type BarberProfileClientProps = {
  barber: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    image: string | null;
    isActive: boolean;
    appointmentsCount: number;
  };
  summary: {
    todayAppointments: number;
    weekPayout: number;
    servicesCount: number;
  };
};

export default function BarberProfileClient({
  barber,
  summary,
}: BarberProfileClientProps) {
  const baseHref = `/admin/barbeiros/${barber.id}`;

  return (
    <div className="space-y-8">
      <SectionCard
        title="Perfil do barbeiro"
        description="Dados, foto e comissões individuais."
        className="overflow-hidden rounded-[30px] border border-sky-500/15 bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(9,12,20,0.98))] shadow-[0_24px_80px_rgba(2,132,199,0.10)]"
        actions={
          <BackLink href="/admin/barbeiros" area="Equipe" className="w-full sm:w-auto" />
        }
      >
        <div className="mb-5 border-b border-white/10 pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
            Equipe
          </p>
          <h3 className="mt-2 text-2xl font-black text-white">
            {barber.name || "Barbeiro"}
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge variant={barber.isActive ? "success" : "danger"}>
                {barber.isActive ? "Ativo" : "Desligado"}
              </StatusBadge>
              <StatusBadge variant="info">{barber.appointmentsCount} agendamento(s)</StatusBadge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  E-mail
                </p>
                <p className="mt-2 break-all text-sm text-zinc-200">
                  {barber.email || "Não informado"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Telefone
                </p>
                <p className="mt-2 text-sm text-zinc-200">
                  {formatBrazilianPhone(barber.phone) || "Não informado"}
                </p>
              </div>
            </div>
          </div>

          <BarberPhotoUploader
            action={updateBarberPhotoAction}
            barberId={barber.id}
            currentImage={barber.image}
            name={barber.name || "Barbeiro"}
            compact
          />
        </div>
        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
            Ações do perfil
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <ProfileMenuCard
              href={`${baseHref}/agendamentos-hoje`}
              label="Agendamentos de hoje"
              value={`${summary.todayAppointments}`}
              helper="Ver horários do dia"
            />
            <ProfileMenuCard
              href={`${baseHref}/repasse-semana`}
              label="Repasse da semana atual"
              value={formatCurrency(summary.weekPayout)}
              helper="Serviços e extras concluídos na semana"
            />
            <ProfileMenuCard
              href={`${baseHref}/servicos`}
              label="Serviços"
              value={`${summary.servicesCount}`}
              helper="Editar comissões individuais"
            />
            <ProfileMenuCard
              href={`${baseHref}/disponibilidade`}
              label="Disponibilidade"
              value="Agenda"
              helper="Editar horários e bloqueios"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function ProfileMenuCard({
  href,
  label,
  value,
  helper,
}: {
  href: string;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[76px] items-center justify-between gap-3 overflow-hidden rounded-2xl border border-sky-400/18 bg-black/20 px-3.5 py-3 outline-none transition hover:border-sky-300/55 hover:bg-sky-500/10 focus-visible:border-sky-300/70 focus-visible:ring-2 focus-visible:ring-sky-400/30"
      aria-label={`Abrir ${label}`}
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[var(--brand)] opacity-70 transition group-hover:opacity-100" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">
          {label}
        </p>
        <p className="mt-1 truncate text-lg font-bold text-white">{value}</p>
        <p className="mt-1 text-xs text-zinc-400">{helper}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-sky-400/25 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-sky-200 transition group-hover:border-sky-300/60 group-hover:bg-sky-500/20">
        Abrir
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
