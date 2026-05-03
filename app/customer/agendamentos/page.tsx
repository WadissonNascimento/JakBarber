import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EmptyState from "@/components/ui/EmptyState";
import { getAppointmentItemsLabel } from "@/lib/appointmentItems";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { getAppointmentDisplayName } from "@/lib/appointmentServices";
import { getAppointmentGrandTotal } from "@/lib/appointmentServices";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
} from "@/lib/appointmentStatus";
import {
  formatScheduleDate,
  formatScheduleTime,
  isScheduleDateTimePast,
} from "@/lib/scheduleTime";
import CancelAppointmentButton from "./CancelAppointmentButton";
import ReviewForm from "./ReviewForm";

export default async function CustomerAppointmentsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "CUSTOMER") {
    redirect("/painel");
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      customerId: session.user.id,
    },
    include: {
      barber: true,
      items: true,
      services: true,
      review: true,
    },
    orderBy: {
      date: "asc",
    },
  });
  const whatsappNumber = process.env.BARBER_WHATSAPP_NUMBER || "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-white">
      <PageHeader
        title="Meus agendamentos"
        description="Veja seus horarios e acompanhe o andamento de cada atendimento em uma pagina so."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/agendar"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Novo agendamento
            </Link>
            <Link
              href="/customer"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              Voltar ao painel
            </Link>
          </div>
        }
      />

      <SectionCard
        title="Agenda do cliente"
        description="Cada card abaixo concentra data, hora, barbeiro, servicos e status."
      >
        {appointments.length === 0 ? (
          <EmptyState
            title="Nenhum agendamento por enquanto"
            description="Quando voce reservar seu primeiro horario, ele aparecera aqui."
            actionLabel="Agendar agora"
            actionHref="/agendar"
          />
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const date = new Date(appointment.date);
              const time = formatScheduleTime(date);
              const dateLabel = formatScheduleDate(date);
              const serviceLabel = getAppointmentDisplayName(appointment.services);
              const whatsappMessage = encodeURIComponent(
                `Ola! Quero falar sobre meu agendamento de ${dateLabel} as ${time} com ${appointment.barber.name || "o barbeiro"} para ${serviceLabel}.`
              );
              const whatsappHref = whatsappNumber
                ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
                : null;
              const canCancel =
                !["CANCELLED", "COMPLETED", "DONE", "NO_SHOW"].includes(
                  appointment.status
                ) && !isScheduleDateTimePast(date);
              const canReview = ["COMPLETED", "DONE"].includes(appointment.status);

              return (
                <div
                  key={appointment.id}
                  className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                        Servicos
                      </p>
                      <p className="mt-2 break-words text-lg font-semibold text-white">
                        {serviceLabel}
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">
                        Com {appointment.barber.name || "Barbeiro"}
                      </p>
                    </div>

                    <StatusBadge
                      variant={appointmentStatusVariant(appointment.status)}
                      className="justify-self-end"
                    >
                      {appointmentStatusLabel(appointment.status)}
                    </StatusBadge>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <InfoBlock
                      label="Data"
                      value={dateLabel}
                    />
                    <InfoBlock
                      label="Hora"
                      value={time}
                    />
                    <InfoBlock
                      label="Observacoes"
                      value={appointment.notes || "Sem observacoes registradas"}
                    />
                    <InfoBlock
                      label="Extras"
                      value={getAppointmentItemsLabel(appointment.items)}
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Total</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {getAppointmentGrandTotal(
                        appointment.services,
                        appointment.items
                      ).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                    <Link
                      href="/agendar"
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
                    >
                      Remarcar horario
                    </Link>
                    {whatsappHref ? (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1ebe5d]"
                      >
                        <WhatsAppIcon />
                        <span>Falar no WhatsApp</span>
                      </a>
                    ) : null}
                    {canCancel ? (
                      <CancelAppointmentButton appointmentId={appointment.id} />
                    ) : null}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-zinc-500">
                      Chegue 5 minutos antes do horario marcado.
                    </p>
                  </div>

                  {canReview ? (
                    appointment.review ? (
                      <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
                        <p className="text-sm font-semibold text-white">
                          Avaliacao enviada
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-300">
                          Obrigado pelo feedback. Sua avaliacao foi registrada.
                        </p>
                      </div>
                    ) : (
                      <ReviewForm appointmentId={appointment.id} />
                    )
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 448 512"
      className="h-5 w-5 shrink-0"
      fill="currentColor"
    >
      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32 101.5 32 1.9 131.6 1.9 254c0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3 18.6-68.1-4.4-7C49.1 322.8 39.4 288.9 39.4 254c0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.5-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.5-19.4 19-19.4 46.3s19.9 53.7 22.6 57.4c2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.6-6.6z" />
    </svg>
  );
}

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}
