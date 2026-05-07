import {
  CalendarPlus,
  CalendarDays,
  KeyRound,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/ui/DashboardShell";
import DashboardEntryCard from "@/components/ui/DashboardEntryCard";

export default async function CustomerPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "CUSTOMER") {
    redirect("/painel");
  }

  const appointmentsCount = await prisma.appointment.count({
    where: {
      customerId: session.user.id,
    },
  });

  const entries = [
    {
      href: "/agendar",
      icon: CalendarPlus,
      title: "Agendar horário",
      description: "Escolha barbeiro, serviço e melhor horário.",
    },
    {
      href: "/customer/agendamentos",
      icon: CalendarDays,
      title: "Meus agendamentos",
      description: "Horários marcados, barbeiro e status.",
      badge: appointmentsCount ? `${appointmentsCount}` : undefined,
    },
    {
      href: "/produtos",
      icon: ShoppingBag,
      title: "Arsenal do barbeiro",
      description: "Produtos para rotina, bancada e revenda.",
    },
    {
      href: "/meu-perfil",
      icon: UserRound,
      title: "Meu cadastro",
      description: "Dados, preferências e barbeiro favorito.",
    },
    {
      href: "/forgot-password",
      icon: KeyRound,
      title: "Trocar senha",
      description: "Receba um código por e-mail.",
    },
  ];

  return (
    <div className="min-h-screen">
      <DashboardShell>
        <section className="dashboard-panel p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-strong)]">
                Minha conta
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                Painel do cliente
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Tudo que voce precisa antes e depois do atendimento.
              </p>
            </div>

            <div className="dashboard-subpanel p-4 sm:min-w-[220px]">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Agendamentos
              </p>
              <p className="mt-3 text-2xl font-bold text-white">{appointmentsCount}</p>
              <p className="mt-1 text-xs text-zinc-400">historico completo</p>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
      </DashboardShell>
    </div>
  );
}
