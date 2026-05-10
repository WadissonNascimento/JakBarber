import { redirect } from "next/navigation";
import { auth } from "@/auth";
import BackLink from "@/components/ui/BackLink";
import DashboardShell from "@/components/ui/DashboardShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";
import { getAppointmentItemsLabel } from "@/lib/appointmentItems";
import {
  getAppointmentDisplayName,
  getAppointmentGrandTotal,
  getAppointmentTotalBarberPayout,
} from "@/lib/appointmentServices";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AdminBarberRouteParams = {
  params: Promise<{ barberId: string }>;
};

function getDayRange(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export default async function BarberTodayAppointmentsPage({ params }: AdminBarberRouteParams) {
  const session = await auth();
  const { barberId } = await params;

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/painel");

  const barber = await prisma.user.findFirst({
    where: {
      id: barberId,
      role: "BARBER",
    },
  });

  if (!barber) redirect("/admin/barbeiros");

  const { start, end } = getDayRange();
  const appointments = await prisma.appointment.findMany({
    where: {
      barberId: barber.id,
      date: {
        gte: start,
        lte: end,
      },
      status: {
        not: "CANCELLED",
      },
    },
    include: {
      customer: true,
      items: true,
      services: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  return (
    <DashboardShell>
      <PageHeader
        eyebrow={barber.name || "Barbeiro"}
        title="Agendamentos de hoje"
        description="Somente os horários deste barbeiro no dia."
        actions={<BackLink href={`/admin/barbeiros/${barber.id}`} area="Perfil" />}
      />

      {appointments.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-400">
          Nenhum agendamento para hoje.
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => {
            const status = normalizeAppointmentStatus(appointment.status);

            return (
              <article
                key={appointment.id}
                className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,40,61,0.72),rgba(13,18,30,0.98))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-white">
                      {appointment.date.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="mt-2 truncate font-semibold text-white">
                      {appointment.customer.name || "Cliente"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {getAppointmentDisplayName(appointment.services) || "Serviço"}
                    </p>
                  </div>
                  <StatusBadge variant={appointmentStatusVariant(status)}>
                    {appointmentStatusLabel(status)}
                  </StatusBadge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <InfoBox
                    label="Total"
                    value={formatCurrency(
                      getAppointmentGrandTotal(appointment.services, appointment.items)
                    )}
                  />
                  <InfoBox
                    label="Repasse"
                    value={formatCurrency(
                      getAppointmentTotalBarberPayout(appointment.services, appointment.items)
                    )}
                  />
                </div>

                <p className="mt-3 text-xs text-sky-200">
                  Extras: {getAppointmentItemsLabel(appointment.items)}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
