import { redirect } from "next/navigation";
import { auth } from "@/auth";
import PageHeader from "@/components/ui/PageHeader";
import { normalizeAppointmentStatus } from "@/lib/appointmentStatus";
import { getAppointmentTotalBarberPayout } from "@/lib/appointmentServices";
import { getWeekRange } from "@/lib/financials";
import { prisma } from "@/lib/prisma";
import BarberProfileClient from "./BarberProfileClient";

function getDayRange(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export default async function AdminBarberProfilePage({
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
    include: {
      _count: {
        select: {
          barberAppointments: true,
        },
      },
    },
  });

  if (!barber) {
    redirect("/admin/barbeiros");
  }

  const { start: todayStart, end: todayEnd } = getDayRange();
  const { start: weekStart, end: weekEnd } = getWeekRange();

  const [servicesCount, todayAppointments, weekAppointments] = await Promise.all([
    prisma.service.count({
      where: {
        OR: [{ barberId: barber.id }, { barberId: null }],
      },
    }),
    prisma.appointment.findMany({
      where: {
        barberId: barber.id,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        items: true,
        services: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        barberId: barber.id,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        items: true,
        services: true,
      },
    }),
  ]);

  const activeTodayAppointments = todayAppointments.filter(
    (appointment) => normalizeAppointmentStatus(appointment.status) !== "CANCELLED"
  );
  const completedTodayAppointments = todayAppointments.filter(
    (appointment) => normalizeAppointmentStatus(appointment.status) === "COMPLETED"
  );
  const completedWeekAppointments = weekAppointments.filter(
    (appointment) => normalizeAppointmentStatus(appointment.status) === "COMPLETED"
  );

  const todayPayout = completedTodayAppointments.reduce(
    (sum, appointment) =>
      sum + getAppointmentTotalBarberPayout(appointment.services, appointment.items),
    0
  );
  const weekPayout = completedWeekAppointments.reduce(
    (sum, appointment) =>
      sum + getAppointmentTotalBarberPayout(appointment.services, appointment.items),
    0
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <PageHeader
        eyebrow="Equipe"
        title="Perfil do barbeiro"
        description="Dados, foto e comissões individuais."
      />

      <BarberProfileClient
        barber={{
          id: barber.id,
          name: barber.name,
          email: barber.email,
          phone: barber.phone,
          image: barber.image,
          isActive: barber.isActive,
          appointmentsCount: barber._count.barberAppointments,
        }}
        summary={{
          todayAppointments: activeTodayAppointments.length,
          todayPayout,
          weekPayout,
          servicesCount,
        }}
      />
    </div>
  );
}
