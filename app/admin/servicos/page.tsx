import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminServicesClient from "./AdminServicesClient";

export default async function AdminServicosPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/painel");
  }

  const services = await prisma.service.findMany({
    include: {
      barber: true,
    },
    orderBy: [{ barberId: "asc" }, { createdAt: "desc" }],
  });

  const globalServices = services.filter((service) => service.barberId === null);
  const barberServices = services.filter((service) => service.barberId !== null);
  const barbers = await prisma.user.findMany({
    where: {
      role: "BARBER",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 text-white">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Serviços e comissões</h1>
          <p className="text-zinc-400">
            O admin controla os percentuais de repasse de todos os serviços, gerais e exclusivos.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
        >
          Voltar ao admin
        </Link>
      </div>

      <AdminServicesClient
        globalServices={globalServices}
        barberServices={barberServices}
        barbers={barbers}
      />
    </div>
  );
}
