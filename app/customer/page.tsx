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
import PageHeader from "@/components/ui/PageHeader";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#18233b_0%,#0b0e16_45%,#06070b_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-10 text-white">
        <PageHeader
          eyebrow="Minha Conta"
          title="Painel do cliente"
          description="Tudo que vocé precisa antes e depois do atendimento."
        />

        <div className="grid gap-4 sm:grid-cols-2">
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
