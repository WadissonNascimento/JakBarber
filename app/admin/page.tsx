import {
  CalendarRange,
  Coins,
  DollarSign,
  MessageSquareText,
  PackageSearch,
  Scissors,
  UsersRound,
} from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardEntryCard from "@/components/ui/DashboardEntryCard";
import { appointmentStatusLabel } from "@/lib/appointmentStatus";
import { formatAppointmentPublicId } from "@/lib/appointmentPublicId";
import {
  formatScheduleTime,
  getCurrentScheduleDate,
  getCurrentScheduleDateValue,
  getScheduleDayRange,
} from "@/lib/scheduleTime";
import { formatCurrency } from "@/lib/utils";

function getTodayRange() {
  return getScheduleDayRange(getCurrentScheduleDateValue())!;
}

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/painel");
  }

  const { start: todayStart, end: todayEnd } = getTodayRange();
  const currentScheduleDate = getCurrentScheduleDate();
  const [
    activeBarbers,
    activeProducts,
    openPayouts,
    pendingInvites,
    visibleReviews,
    todayAppointments,
    completedTodayAppointments,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        role: "BARBER",
        isActive: true,
      },
    }),
    prisma.product.count({
      where: {
        isActive: true,
      },
    }),
    prisma.barberPayout.count({
      where: {
        status: {
          in: ["OPEN", "CLOSED"],
        },
      },
    }),
    prisma.pendingRegistration.count({
      where: {
        role: "BARBER",
      },
    }),
    prisma.review.count({
      where: {
        isVisible: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        barber: true,
        customer: true,
        services: true,
      },
      orderBy: {
        date: "asc",
      },
    }),
    prisma.appointment.findMany({
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          in: ["COMPLETED", "DONE"],
        },
      },
      include: {
        services: true,
      },
    }),
  ]);
  const todayRevenue = completedTodayAppointments.reduce(
    (sum, appointment) =>
      sum +
      appointment.services.reduce(
        (servicesSum, service) => servicesSum + service.priceSnapshot,
        0
      ),
    0
  );
  const nextAppointments = todayAppointments
    .filter(
      (appointment) =>
        new Date(appointment.date).getTime() >= currentScheduleDate.getTime() &&
        !["CANCELLED", "COMPLETED", "DONE", "NO_SHOW"].includes(appointment.status)
    )
    .slice(0, 3);

  const entries = [
    {
      href: "/admin/agenda",
      icon: CalendarRange,
      title: "Agenda geral",
      description: "Horários de todos os barbeiros em um lugar.",
    },
    {
      href: "/admin/barbeiros",
      icon: UsersRound,
      title: "Equipe",
      description: "Barbeiros, acessos e status.",
      badge: activeBarbers ? `${activeBarbers}` : undefined,
    },
    {
      href: "/admin/servicos",
      icon: Scissors,
      title: "Serviços",
      description: "Preços, duração e repasse dos serviços.",
    },
    {
      href: "/admin/produtos",
      icon: PackageSearch,
      title: "Produtos",
      description: "Catélogo, estoque e itens ativos do Arsenal.",
      badge: activeProducts ? `${activeProducts}` : undefined,
    },
    {
      href: "/admin/avaliacoes",
      icon: MessageSquareText,
      title: "Avaliações",
      description: "Moderacao dos comentários do site.",
      badge: visibleReviews ? `${visibleReviews}` : undefined,
    },
    {
      href: "/admin/financeiro",
      icon: Coins,
      title: "Financeiro",
      description: "Faturamento, repasses e fechamentos.",
      badge: openPayouts ? `${openPayouts}` : undefined,
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-5 text-white sm:px-6 sm:py-8">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-strong)]">
              Admin
            </p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Hoje na barbearia
            </h1>
            <p className="text-sm text-zinc-400">
              Agenda, equipe e dinheiro do dia em um lugar so.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminMetric
              icon={<CalendarRange />}
              label="Atendimentos"
              value={`${todayAppointments.length}`}
              helper={`${completedTodayAppointments.length} concluídos`}
            />
            <AdminMetric
              icon={<UsersRound />}
              label="Barbeiros ativos"
              value={`${activeBarbers}`}
              helper={pendingInvites ? `${pendingInvites} convite(s)` : "equipe pronta"}
            />
            <AdminMetric
              icon={<DollarSign />}
              label="Faturado hoje"
              value={formatCurrency(todayRevenue)}
              helper="atendimentos concluídos"
            />
            <AdminMetric
              icon={<Coins />}
              label="Repasses"
              value={`${openPayouts}`}
              helper="em aberto"
            />
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Próximos horários</h2>
                <p className="mt-1 text-sm text-zinc-400">O que ainda vem hoje.</p>
              </div>
              <a
                href="/admin/agenda"
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)]"
              >
                Ver agenda
              </a>
            </div>

            <div className="mt-4 space-y-3">
              {nextAppointments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-zinc-400">
                  Nenhum horário agendado para hoje.
                </div>
              ) : (
                nextAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-bold text-white">
                          {formatScheduleTime(new Date(appointment.date))}
                        </p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
                          {formatAppointmentPublicId(appointment.publicId)}
                        </p>
                        <p className="mt-2 font-semibold text-white">
                          {appointment.customer.name || "Cliente"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {appointment.barber.name || "Barbeiro"}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300">
                        {appointmentStatusLabel(appointment.status)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5">
            <h2 className="text-xl font-semibold text-white">Pendencias</h2>
            <div className="mt-4 space-y-3">
              <AdminAction href="/admin/financeiro" label="Repasses para conferir" value={openPayouts} />
              <AdminAction href="/admin/barbeiros" label="Convites de barbeiro" value={pendingInvites} />
              <AdminAction href="/admin/produtos" label="Produtos ativos" value={activeProducts} />
            </div>
          </section>
        </div>

        <div className="mt-5">
          <h2 className="text-xl font-semibold text-white">Rotinas do admin</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Acesse quando precisar ajustar alguma parte da barbearia.
          </p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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

function AdminMetric({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
        <span className="h-4 w-4 text-[var(--brand-strong)] [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{helper}</p>
    </div>
  );
}

function AdminAction({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)]"
    >
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="rounded-full bg-[var(--brand-muted)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
        {value}
      </span>
    </a>
  );
}
