import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/LogoutButton";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { getAppointmentDisplayName } from "@/lib/appointmentServices";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
} from "@/lib/appointmentStatus";
import { formatAppointmentPublicId } from "@/lib/appointmentPublicId";
import { formatScheduleDate, formatScheduleTime } from "@/lib/scheduleTime";
import ProfileForm from "./ProfileForm";

export default async function MeuPerfilPage({
}: {
  searchParams?: { feedback?: string; tone?: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "CUSTOMER") {
    redirect("/painel");
  }

  const [customer, appointments, barbers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        customerProfile: {
          include: {
            preferredBarber: true,
          },
        },
      },
    }),
    prisma.appointment.findMany({
      where: {
        customerId: session.user.id,
      },
      include: {
        barber: true,
        services: true,
      },
      orderBy: {
        date: "desc",
      },
    }),
    prisma.user.findMany({
      where: {
        role: "BARBER",
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const favoriteServiceMap = new Map<string, number>();

  for (const appointment of appointments) {
    favoriteServiceMap.set(
      getAppointmentDisplayName(appointment.services),
      (favoriteServiceMap.get(getAppointmentDisplayName(appointment.services)) || 0) + 1
    );
  }

  const favoriteService = Array.from(favoriteServiceMap.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || null;
  const profile = customer?.customerProfile;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <PageHeader
        title="Meu perfil"
        description="Veja seus dados, preferências e histórico de serviços."
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/customer"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              Voltar ao painel
            </Link>
            <LogoutButton />
          </div>
        }
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[380px_1fr]">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">Informações pessoais</h2>

          <ProfileForm
            customer={{
              name: customer?.name || "",
              email: customer?.email || "",
              phone: customer?.phone || "",
            }}
            profile={
              profile
                ? {
                    preferredBarberId: profile.preferredBarberId,
                    allergies: profile.allergies,
                    preferences: profile.preferences,
                  }
                : null
            }
            barbers={barbers}
          />

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-sm text-zinc-400">Total de atendimentos</p>
              <p className="mt-1 text-2xl font-semibold">{appointments.length}</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-sm text-zinc-400">Serviço favorito</p>
              <p className="mt-1 text-lg font-semibold">
                {favoriteService || "Ainda indefinido"}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-sm text-zinc-400">Barbeiro preferido</p>
              <p className="mt-1 text-lg font-semibold">
                {profile?.preferredBarber?.name || "Não informado"}
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-8">
          <SectionCard
            title="Resumo do perfil"
            description="Informações que ajudam a personalizar melhor seus próximos atendimentos."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Alergias ou cuidados
                </p>
                <p className="mt-2 text-sm text-white">
                  {profile?.allergies || "Nenhuma observação registrada"}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Preferências
                </p>
                <p className="mt-2 text-sm text-white">
                  {profile?.preferences || "Nenhuma preferência registrada"}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Histórico de serviços"
            description="Linha do tempo dos seus últimos atendimentos."
            actions={
              <Link
                href="/agendar"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Novo agendamento
              </Link>
            }
          >
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <EmptyState
                  title="Sem histórico de serviços"
                  description="Seus atendimentos vão aparecer aqui com status e barbeiro."
                  actionLabel="Agendar atendimento"
                  actionHref="/agendar"
                />
              ) : (
                appointments.map((appointment, index) => (
                  <div
                    key={appointment.id}
                    className={`rounded-2xl border p-4 ${
                      index === 0
                        ? "border-sky-500/30 bg-sky-500/10"
                        : "border-zinc-800 bg-zinc-950/70"
                    }`}
                  >
                    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-strong)]">
                          {formatAppointmentPublicId(appointment.publicId)}
                        </p>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          {index === 0 ? "último atendimento" : "Atendimento"}
                        </p>
                        <p className="mt-1 break-words text-lg font-semibold text-white">
                          {getAppointmentDisplayName(appointment.services)}
                        </p>
                      </div>
                      <StatusBadge
                        variant={appointmentStatusVariant(appointment.status)}
                        className="justify-self-end"
                      >
                        {appointmentStatusLabel(appointment.status)}
                      </StatusBadge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Data
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {formatScheduleDate(new Date(appointment.date))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Hora
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {formatScheduleTime(new Date(appointment.date))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Barbeiro
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {appointment.barber.name || "Barbeiro"}
                        </p>
                      </div>
                    </div>

                    {appointment.notes && (
                      <p className="mt-3 text-sm text-zinc-300">
                        Observações: {appointment.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
