import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AvailabilitySection } from "@/app/barber/_components/AvailabilitySection";
import { getBarberAvailabilityData } from "@/app/barber/data";
import DashboardShell from "@/components/ui/DashboardShell";
import BackLink from "@/components/ui/BackLink";
import PageHeader from "@/components/ui/PageHeader";
import { prisma } from "@/lib/prisma";
import {
  createAdminBarberBlockAction,
  createAdminRecurringBarberBlockAction,
  deleteAdminBarberBlockAction,
  saveAdminBarberAvailabilityAction,
} from "../../actions";

type AdminBarberAvailabilityRouteParams = {
  params: Promise<{ barberId: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminBarberAvailabilityPage({
  params,
}: AdminBarberAvailabilityRouteParams) {
  const session = await auth();
  const { barberId } = await params;

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/painel");

  const barber = await prisma.user.findFirst({
    where: {
      id: barberId,
      role: "BARBER",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!barber) {
    redirect("/admin/barbeiros");
  }

  const availabilityData = await getBarberAvailabilityData(barber.id);
  const barberName = barber.name || barber.email || "Barbeiro";

  return (
    <DashboardShell>
      <div className="space-y-6">
        <BackLink
          href={`/admin/barbeiros/${barber.id}`}
          area="Perfil"
          className="w-full sm:w-auto"
        />

        <PageHeader
          eyebrow="Equipe"
          title={`Disponibilidade de ${barberName}`}
          description="Ajuste horarios, dias abertos e bloqueios deste barbeiro."
          variant="plain"
        />

        <AvailabilitySection
          availabilities={availabilityData.availabilities}
          blocks={availabilityData.blocks}
          recurringBlocks={availabilityData.recurringBlocks}
          targetBarberId={barber.id}
          saveAvailabilityAction={saveAdminBarberAvailabilityAction}
          createBlockAction={createAdminBarberBlockAction}
          createRecurringBlockAction={createAdminRecurringBarberBlockAction}
          deleteBlockAction={deleteAdminBarberBlockAction}
        />
      </div>
    </DashboardShell>
  );
}
