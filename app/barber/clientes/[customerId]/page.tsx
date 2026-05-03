import Link from "next/link";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  getAppointmentDisplayName,
  getAppointmentTotalPrice,
} from "@/lib/appointmentServices";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
} from "@/lib/appointmentStatus";
import { ClientNoteForm } from "../../_components/ClientNoteForm";
import { getBarberClientProfile } from "../../data";

export default async function BarberClientProfilePage({
  params,
}: {
  params: { customerId: string };
  searchParams?: { feedback?: string; tone?: string };
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

  const profile = await getBarberClientProfile(session.user.id, params.customerId);

  if (!profile) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <PageHeader
        title="Perfil do cliente"
        description="Histórico completo deste cliente com vocé."
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/barber/clientes"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              Buscar clientes
            </Link>
            <Link
              href="/barber"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              Voltar ao painel
            </Link>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">{profile.customer.name}</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-zinc-400">E-mail</p>
              <p className="mt-1 text-white">{profile.customer.email || "Não informado"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-zinc-400">Telefone</p>
              <p className="mt-1 text-white">{profile.customer.phone || "Não informado"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-zinc-400">Cliente desde</p>
              <p className="mt-1 text-white">
                {new Date(profile.customer.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-zinc-400">Nascimento</p>
              <p className="mt-1 text-white">
                {profile.customer.birthDate
                  ? new Date(profile.customer.birthDate).toLocaleDateString("pt-BR")
                  : "Não informado"}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-zinc-400">Barbeiro preferido</p>
              <p className="mt-1 text-white">
                {profile.customer.preferredBarberName || "Sem preferência definida"}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-zinc-400">Alergias ou cuidados</p>
              <p className="mt-1 text-white">
                {profile.customer.allergies || "Nenhuma observação registrada"}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-zinc-400">Preferências</p>
              <p className="mt-1 text-white">
                {profile.customer.preferences || "Nenhuma preferência registrada"}
              </p>
            </div>
          </div>

          <ClientNoteForm
            customerId={profile.customer.id}
            initialNote={profile.customer.note}
            rows={5}
          />
        </section>

        <div className="space-y-8">
          <section className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Atendimentos"
              value={profile.stats.totalAppointments}
            />
            <StatCard
              label="Concluídos"
              value={profile.stats.completedAppointments}
            />
            <StatCard
              label="Valor em serviços"
              value={`R$ ${profile.stats.totalSpent.toFixed(2)}`}
            />
            <StatCard
              label="Serviço favorito"
              value={profile.stats.favoriteService || "-"}
            />
          </section>

          <SectionCard
            title="Histórico de atendimentos"
            description="Lista completa dos serviços feitos com este cliente."
          >
            <div className="space-y-4">
              {profile.appointments.length === 0 ? (
                <EmptyState
                  title="Sem atendimentos registrados"
                  description="Assim que esse cliente concluir atendimentos, o histórico aparecerá aqui."
                />
              ) : (
                profile.appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Data
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {new Date(appointment.date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Hora
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {new Date(appointment.date).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Serviço
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {getAppointmentDisplayName(appointment.services)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Valor
                        </p>
                        <p className="mt-2 text-sm text-white">
                          R$ {getAppointmentTotalPrice(appointment.services).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Status
                        </p>
                        <div className="mt-2">
                          <StatusBadge variant={appointmentStatusVariant(appointment.status)}>
                            {appointmentStatusLabel(appointment.status)}
                          </StatusBadge>
                        </div>
                      </div>
                    </div>

                    {appointment.notes && (
                      <p className="mt-3 text-sm text-zinc-400">
                        Obs: {appointment.notes}
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
