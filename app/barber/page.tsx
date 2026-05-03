import {
  CalendarRange,
  Clock3,
  Scissors,
  Users,
} from "lucide-react";
import DashboardEntryCard from "@/components/ui/DashboardEntryCard";
import BarberTodayDashboard from "./_components/BarberTodayDashboard";
import { getBarberDashboardData } from "./data";
import { requireActiveBarber } from "./guard";
import BarberPhotoUploader from "@/components/BarberPhotoUploader";
import { updateOwnBarberPhotoAction } from "./actions";

export default async function BarberPage() {
  const { session, barber } = await requireActiveBarber();
  const dashboard = await getBarberDashboardData(session.user.id, {
    view: "day",
    status: "ALL",
  });

  const entries = [
    {
      href: "/barber/agenda",
      icon: CalendarRange,
      title: "Agenda",
      description: "Filtros, histórico e status dos atendimentos.",
      badge: dashboard.summary.appointmentsToday
        ? `${dashboard.summary.appointmentsToday}`
        : undefined,
    },
    {
      href: "/barber/servicos",
      icon: Scissors,
      title: "Serviços",
      description: "Crie e ajuste seus serviços exclusivos.",
      badge: dashboard.services.length ? `${dashboard.services.length}` : undefined,
    },
    {
      href: "/barber/disponibilidade",
      icon: Clock3,
      title: "Disponibilidade",
      description: "Horários da semana, pausas e bloqueios.",
      badge:
        dashboard.blocks.length || dashboard.recurringBlocks.length
          ? `${dashboard.blocks.length + dashboard.recurringBlocks.length}`
          : undefined,
    },
    {
      href: "/barber/clientes",
      icon: Users,
      title: "Clientes",
      description: "Perfis, contato e anotacoes importantes.",
      badge: dashboard.clients.length ? `${dashboard.clients.length}` : undefined,
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-5 text-white sm:px-6 sm:py-8">
        <div className="mb-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-strong)]">
              Painel do barbeiro
            </p>
            <p className="mt-1 truncate text-sm text-zinc-400">
              {session.user.name || "Barbeiro"}
            </p>
          </div>
        </div>

        <div className="mb-4 max-w-xl">
          <BarberPhotoUploader
            action={updateOwnBarberPhotoAction}
            currentImage={barber.image}
            name={barber.name || "Barbeiro"}
          />
        </div>

        <BarberTodayDashboard
          barberName={session.user.name || "Barbeiro"}
          summary={dashboard.summary}
          walkInServices={dashboard.walkInServices}
        />

        <div className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Atalhos</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Rotinas que não precisam ficar na frente da agenda.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <DashboardEntryCard
              key={entry.href}
              href={entry.href}
              icon={entry.icon}
              title={entry.title}
              description={entry.description}
              badge={entry.badge}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
