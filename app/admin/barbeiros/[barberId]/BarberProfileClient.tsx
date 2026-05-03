"use client";

import Link from "next/link";
import BarberPhotoUploader from "@/components/BarberPhotoUploader";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
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
    todayPayout: number;
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
    <div className="mt-6 space-y-8">
      <SectionCard
        title={barber.name || "Perfil do barbeiro"}
        className="overflow-hidden rounded-[30px] border border-sky-500/15 bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(9,12,20,0.98))] shadow-[0_24px_80px_rgba(2,132,199,0.10)]"
        actions={
          <Link
            href="/admin/barbeiros"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-sky-400/30 hover:bg-sky-500/10"
          >
            Voltar
          </Link>
        }
      >
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
                  {barber.phone || "Não informado"}
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
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <ProfileMenuCard
          href={`${baseHref}/agendamentos-hoje`}
          label="Agendamentos de hoje"
          value={`${summary.todayAppointments}`}
          helper="Ver horários do dia"
        />
        <ProfileMenuCard
          href={`${baseHref}/repasse-hoje`}
          label="Repasse de hoje"
          value={formatCurrency(summary.todayPayout)}
          helper="Serviços e extras concluídos"
        />
        <ProfileMenuCard
          href={`${baseHref}/repasse-semana`}
          label="Repasse da semana"
          value={formatCurrency(summary.weekPayout)}
          helper="Semana atual"
        />
        <ProfileMenuCard
          href={`${baseHref}/servicos`}
          label="Serviços"
          value={`${summary.servicesCount}`}
          helper="Editar comissões individuais"
        />
      </div>
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
      className="group flex items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,40,61,0.72),rgba(13,18,30,0.98))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.18)] transition hover:border-sky-400/30 hover:bg-sky-500/10"
    >
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">
          {label}
        </p>
        <p className="mt-3 truncate text-2xl font-bold text-white">{value}</p>
        <p className="mt-1 text-xs text-zinc-400">{helper}</p>
      </div>
      <span className="shrink-0 text-xl text-zinc-500 transition group-hover:text-sky-200">
        +
      </span>
    </Link>
  );
}
