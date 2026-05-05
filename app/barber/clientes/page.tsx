import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import PageHeader from "@/components/ui/PageHeader";
import { prisma } from "@/lib/prisma";
import { getBarberClientsDirectory } from "../data";
import ClientsDirectoryClient from "./ClientsDirectoryClient";

type SearchParams = {
  q?: string;
};

export default async function BarberClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "BARBER") {
    redirect("/painel");
  }

  const activeBarber = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      role: "BARBER",
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!activeBarber) {
    redirect("/login");
  }

  const result = await getBarberClientsDirectory(
    session.user.id,
    searchParams.q || ""
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <Link
        href="/barber"
        className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)] hover:text-white"
      >
        <ArrowLeft className="h-4 w-4 text-[var(--brand-strong)]" />
        Voltar para o painel
      </Link>

      <PageHeader
        eyebrow="Relacionamento"
        title="Clientes"
        description="Busque clientes, veja frequência e abra o perfil completo de cada um."
      />

      <ClientsDirectoryClient clients={result.clients} search={result.search} />
    </div>
  );
}
