import {
  CalendarRange,
  Coins,
  DollarSign,
  Images,
  MessageSquareText,
  PackagePlus,
  PackageSearch,
  PiggyBank,
  Scissors,
  UserRound,
  UsersRound,
} from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AccountPasswordForm from "@/components/AccountPasswordForm";
import DashboardEntryCard from "@/components/ui/DashboardEntryCard";
import AdminProfileForm from "./AdminProfileForm";
import { updateOwnAccountPasswordAction } from "@/app/accountPasswordActions";
import {
  getCurrentScheduleDateValue,
  getScheduleDayRange,
} from "@/lib/scheduleTime";
import { ensureAdminBarberProfile } from "@/lib/barberAccess";
import { toMoneyNumber } from "@/lib/money";
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

  await ensureAdminBarberProfile(session.user.shopId);
  const adminProfile = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      name: true,
      email: true,
      phone: true,
    },
  });

  const now = new Date();
  const { start: todayStart, end: todayEnd } = getTodayRange();
  const [
    activeBarbers,
    activeProducts,
    openPayouts,
    pendingInvites,
    visibleReviews,
    homeImages,
    todayAppointmentsCount,
    canceledTodayAppointments,
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
        expiresAt: {
          gt: now,
        },
      },
    }),
    prisma.review.count({
      where: {
        isVisible: true,
      },
    }),
    prisma.homeImage.count({
      where: {
        isActive: true,
      },
    }),
    prisma.appointment.count({
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    }),
    prisma.appointment.count({
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          in: ["CANCELED", "CANCELLED", "NO_SHOW"],
        },
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
      select: {
        services: {
          select: {
            priceSnapshot: true,
          },
        },
      },
    }),
  ]);
  const todayRevenue = completedTodayAppointments.reduce(
    (sum, appointment) =>
      sum +
      appointment.services.reduce(
        (servicesSum, service) => servicesSum + toMoneyNumber(service.priceSnapshot),
        0
      ),
    0
  );
  const entries = [
    {
      href: "/barber",
      icon: UserRound,
      title: "Atuar como barbeiro",
      description: "Agenda, encaixes e financeiro da barbearia.",
    },
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
      description: "Catálogo visual e itens ativos do Arsenal.",
      badge: activeProducts ? `${activeProducts}` : undefined,
    },
    {
      href: "/admin/extras",
      icon: PackagePlus,
      title: "Extras",
      description: "Itens vendidos junto ao atendimento.",
    },
    {
      href: "/admin/avaliacoes",
      icon: MessageSquareText,
      title: "Avaliações",
      description: "Moderacao dos comentários do site.",
      badge: visibleReviews ? `${visibleReviews}` : undefined,
    },
    {
      href: "/admin/home",
      icon: Images,
      title: "Fotos da home",
      description: "Troque as imagens principais do site.",
      badge: `${homeImages}/5`,
    },
    {
      href: "/admin/financeiro",
      icon: Coins,
      title: "Financeiro",
      description: "Faturamento, repasses e fechamentos.",
      badge: openPayouts ? `${openPayouts}` : undefined,
    },
    {
      href: "/admin/caixinhas",
      icon: PiggyBank,
      title: "Caixinhas dos barbeiros",
      description: "Resumo e detalhes das caixinhas registradas.",
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

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <AdminMetric
              icon={<CalendarRange />}
              label="Atendimentos"
              value={`${todayAppointmentsCount}`}
              helper={`${completedTodayAppointments.length} concluídos · ${canceledTodayAppointments} cancelados`}
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
          </div>
        </section>

        <section className="mt-4 grid max-w-5xl gap-4 lg:grid-cols-2">
          <AdminProfileForm
            name={adminProfile?.name || ""}
            email={adminProfile?.email || ""}
            phone={adminProfile?.phone || null}
          />
          <AccountPasswordForm
            action={updateOwnAccountPasswordAction}
            title="Senha do admin"
            description="Atualize a senha usada para entrar no painel administrativo."
          />
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-bold text-white">Rotinas do admin</h2>
            <p className="max-w-sm text-base leading-7 text-zinc-400">
              Acesse quando precisar ajustar alguma parte da barbearia.
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
        </section>
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
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        <span className="h-4 w-4 shrink-0 text-[var(--brand-strong)] [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </div>

      <p
        title={value}
        className="mt-3 min-w-0 truncate text-2xl font-black leading-none text-white tabular-nums"
      >
        {value}
      </p>
      <p className="mt-1 truncate text-xs leading-4 text-zinc-400">{helper}</p>
    </div>
  );
}
