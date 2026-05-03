import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import PageHeader from "@/components/ui/PageHeader";
import { prisma } from "@/lib/prisma";
import ServiceCommissionListClient from "./ServiceCommissionListClient";

export default async function BarberServicesPage({
  params,
}: {
  params: { barberId: string };
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/painel");

  const barber = await prisma.user.findFirst({
    where: {
      id: params.barberId,
      role: "BARBER",
    },
  });

  if (!barber) redirect("/admin/barbeiros");

  const services = await prisma.service.findMany({
    where: {
      OR: [{ barberId: barber.id }, { barberId: null }],
    },
    include: {
      barberCommissions: {
        where: {
          barberId: barber.id,
        },
        take: 1,
      },
    },
    orderBy: [
      {
        barberId: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-white">
      <PageHeader
        eyebrow={barber.name || "Barbeiro"}
        title="Serviços"
        description="Serviços que este barbeiro pode executar e suas comissões individuais."
        actions={
          <Link
            href={`/admin/barbeiros/${barber.id}`}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-sky-400/30 hover:bg-sky-500/10"
          >
            Voltar
          </Link>
        }
      />

      <ServiceCommissionListClient
        barberId={barber.id}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          price: service.price,
          duration: service.duration,
          barberId: service.barberId,
          commissionType: service.commissionType,
          commissionValue: service.commissionValue,
          customCommission: service.barberCommissions[0]
            ? {
                commissionType: service.barberCommissions[0].commissionType,
                commissionValue: service.barberCommissions[0].commissionValue,
              }
            : null,
        }))}
      />
    </div>
  );
}
