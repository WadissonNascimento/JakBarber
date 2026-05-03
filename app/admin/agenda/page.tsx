import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EmptyState from "@/components/ui/EmptyState";
import { getAppointmentItemsLabel } from "@/lib/appointmentItems";
import PageHeader from "@/components/ui/PageHeader";
import { PremiumDatePicker, PremiumSelect } from "@/components/ui/PremiumFilters";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  getAppointmentDisplayName,
  getAppointmentGrandTotal,
} from "@/lib/appointmentServices";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
} from "@/lib/appointmentStatus";
import {
  ADMIN_APPOINTMENT_STATUSES,
  getAdminAgendaReport,
} from "@/lib/adminReports";
import { formatScheduleDate, formatScheduleTime } from "@/lib/scheduleTime";

type SearchParams = {
  barberId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
};

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/painel");
  }

  const barbers = await prisma.user.findMany({
    where: {
      role: "BARBER",
    },
    orderBy: {
      name: "asc",
    },
  });

  const barberId = searchParams.barberId || "";
  const dateFrom = searchParams.dateFrom || "";
  const dateTo = searchParams.dateTo || "";
  const status = searchParams.status || "";

  const filters = {
    barberId,
    dateFrom,
    dateTo,
    status,
  };
  const { appointments, summary } = await getAdminAgendaReport(filters);
  const exportParams = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => Boolean(value))
  ).toString();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 text-white">
      <PageHeader
        title="Agenda Geral"
        description="Visualize todos os agendamentos dos barbeiros."
        actions={
          <Link
            href="/admin"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            Voltar ao admin
          </Link>
        }
      />

      <SectionCard
        title="Filtros"
        description="Refine por barbeiro, período e status para localizar horários."
      >
        <form className="grid gap-4 md:grid-cols-5">
          <div>
            <PremiumSelect
              name="barberId"
              label="Barbeiro"
              defaultValue={barberId}
              options={[
                { value: "", label: "Todos" },
                ...barbers.map((barber) => ({
                  value: barber.id,
                  label: barber.name || "Barbeiro",
                })),
              ]}
            />
          </div>

          <div>
            <PremiumDatePicker
              name="dateFrom"
              label="De"
              defaultValue={dateFrom}
            />
          </div>

          <div>
            <PremiumDatePicker
              name="dateTo"
              label="Até"
              defaultValue={dateTo}
            />
          </div>

          <div>
            <PremiumSelect
              name="status"
              label="Status"
              defaultValue={status}
              options={[
                { value: "", label: "Todos" },
                ...ADMIN_APPOINTMENT_STATUSES.map((appointmentStatus) => ({
                  value: appointmentStatus,
                  label: appointmentStatusLabel(appointmentStatus),
                })),
              ]}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90"
            >
              Filtrar
            </button>
          </div>
        </form>
      </SectionCard>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <SectionCard
          title="Total"
          description="Todos os agendamentos do filtro atual."
        >
          <p className="text-3xl font-semibold text-white">{summary.total}</p>
        </SectionCard>

        <SectionCard
          title="Em andamento"
          description="Pendentes e confirmados aguardando atendimento."
        >
          <p className="text-3xl font-semibold text-amber-300">{summary.active}</p>
        </SectionCard>

        <SectionCard
          title="Concluídos"
          description="Atendimentos finalizados dentro do filtro."
        >
          <p className="text-3xl font-semibold text-emerald-300">
            {summary.completed}
          </p>
        </SectionCard>

        <SectionCard
          title="Perdidos"
          description="Cancelados ou marcados como não compareceu."
        >
          <p className="text-3xl font-semibold text-rose-300">
            {summary.cancelled}
          </p>
        </SectionCard>
      </div>

      <SectionCard
        title="Agendamentos"
        description="Lista do dia para acompanhar todos os horários."
        className="mt-8"
        actions={
          <Link
            href={
              exportParams
                ? `/admin/agenda/export?${exportParams}`
                : "/admin/agenda/export"
            }
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            Exportar CSV
          </Link>
        }
      >
        {appointments.length === 0 ? (
          <EmptyState
            title="Nenhum agendamento encontrado"
            description="Ajuste os filtros acima para encontrar outros horários."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Barbeiro</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Serviço</th>
                  <th className="px-4 py-3">Extras</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Observações</th>
                </tr>
              </thead>

              <tbody>
                {appointments.map((appointment) => {
                  const date = new Date(appointment.date);

                  return (
                    <tr
                      key={appointment.id}
                      className="border-b border-zinc-800 text-sm"
                    >
                      <td className="px-4 py-3">
                        {formatScheduleDate(date)}
                      </td>
                      <td className="px-4 py-3">
                        {formatScheduleTime(date)}
                      </td>
                      <td className="px-4 py-3">{appointment.barber.name}</td>
                      <td className="px-4 py-3">{appointment.customer.name}</td>
                      <td className="px-4 py-3">
                        {getAppointmentDisplayName(appointment.services)}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {getAppointmentItemsLabel(appointment.items)}
                      </td>
                      <td className="px-4 py-3">
                        {getAppointmentGrandTotal(appointment.services, appointment.items).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={appointmentStatusVariant(appointment.status)}>
                          {appointmentStatusLabel(appointment.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {appointment.notes || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
