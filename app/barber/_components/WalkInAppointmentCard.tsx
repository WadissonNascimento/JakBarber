"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Plus, X } from "lucide-react";
import FeedbackMessage from "@/components/FeedbackMessage";
import { isActiveAppointmentStatus, minutesToTime, toMinutes } from "@/lib/barberSchedule";
import {
  formatScheduleTime,
  getCurrentScheduleDate,
  getCurrentScheduleMinutes,
  getScheduleMinutes,
} from "@/lib/scheduleTime";
import { formatCurrency } from "@/lib/utils";
import { createWalkInAppointmentAction } from "../actions";
import type { getBarberDashboardData } from "../data";

type BarberDashboardData = Awaited<ReturnType<typeof getBarberDashboardData>>;

type WalkInAppointmentCardProps = {
  services: BarberDashboardData["walkInServices"];
  activeAppointments: Array<{
    date: Date;
    status: string;
    occupiedDuration: number;
  }>;
};

type WalkInSuccessDetails = {
  customerName: string;
  serviceName: string;
  startTime: string;
};

function getRoundedStartTime() {
  const currentMinutes = getCurrentScheduleMinutes();
  const roundedMinutes = Math.ceil(currentMinutes / 5) * 5;

  return minutesToTime(Math.min(roundedMinutes, 23 * 60 + 55));
}

function getSuggestedStartTime(
  activeAppointments: WalkInAppointmentCardProps["activeAppointments"],
  serviceDuration: number
) {
  let candidateMinutes = toMinutes(getRoundedStartTime());

  const sortedAppointments = activeAppointments
    .filter((appointment) => isActiveAppointmentStatus(appointment.status))
    .map((appointment) => {
      const startDate = new Date(appointment.date);
      const startMinutes = getScheduleMinutes(startDate);

      return {
        startMinutes,
        endMinutes: startMinutes + appointment.occupiedDuration,
      };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);

  for (const appointment of sortedAppointments) {
    if (candidateMinutes >= appointment.endMinutes) {
      continue;
    }

    if (candidateMinutes + serviceDuration <= appointment.startMinutes) {
      break;
    }

    candidateMinutes = Math.max(candidateMinutes, appointment.endMinutes);
  }

  return minutesToTime(candidateMinutes);
}

function formatTime(date: Date) {
  return formatScheduleTime(new Date(date));
}

function getGapLabel(nextAppointmentDate: Date | null) {
  if (!nextAppointmentDate) {
    return "Sem próximo atendimento hoje.";
  }

  const diffMinutes = Math.max(
    0,
    Math.floor(
      (new Date(nextAppointmentDate).getTime() - getCurrentScheduleDate().getTime()) /
        60000
    )
  );

  return `${diffMinutes} min livres até ${formatTime(nextAppointmentDate)}.`;
}

export default function WalkInAppointmentCard({
  services,
  activeAppointments,
}: WalkInAppointmentCardProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [successDetails, setSuccessDetails] = useState<WalkInSuccessDetails | null>(null);
  const [isPending, startTransition] = useTransition();
  const defaultService = services[0];
  const [selectedServiceId, setSelectedServiceId] = useState(defaultService?.id || "");
  const [startTime, setStartTime] = useState(() =>
    getSuggestedStartTime(activeAppointments, defaultService?.duration || 30)
  );
  const isDisabled = services.length === 0;
  const selectedService =
    services.find((service) => service.id === selectedServiceId) || defaultService || null;

  const nextAppointmentDate = useMemo(() => {
    const nextDates = activeAppointments
      .filter((appointment) => isActiveAppointmentStatus(appointment.status))
      .map((appointment) => new Date(appointment.date))
      .sort((a, b) => a.getTime() - b.getTime());

    return nextDates[0] || null;
  }, [activeAppointments]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!defaultService) {
      return;
    }

    setSelectedServiceId((current) =>
      current && services.some((service) => service.id === current) ? current : defaultService.id
    );
  }, [defaultService, services]);

  useEffect(() => {
    if (!mounted || (!isOpen && !isSuccessOpen)) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;

    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isOpen, isSuccessOpen, mounted]);

  function closeModal() {
    if (isPending) {
      return;
    }

    setIsOpen(false);
    setFeedback({ message: null, tone: "success" });
  }

  function closeSuccessModal() {
    setIsSuccessOpen(false);
    setSuccessDetails(null);
  }

  function openWalkInModal() {
    const initialService = defaultService || services[0] || null;
    setSelectedServiceId(initialService?.id || "");
    setStartTime(getSuggestedStartTime(activeAppointments, initialService?.duration || 30));
    setFeedback({ message: null, tone: "success" });
    setIsOpen(true);
  }

  return (
    <>
      <button
        type="button"
        disabled={isDisabled}
        onClick={openWalkInModal}
        className="flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        <span>Criar encaixe</span>
      </button>

      {mounted && isOpen
        ? createPortal(
            <ModalShell onClose={closeModal}>
              <div className="max-h-[calc(100svh-2rem)] overflow-y-auto rounded-[28px] border border-white/10 bg-[#050b16] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-strong)]">
                        Encaixe
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        Criar encaixe
                      </h2>
                      <p className="mt-1 text-sm text-zinc-400">
                        {getGapLabel(nextAppointmentDate)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4">
                    <FeedbackMessage
                      message={feedback.tone === "error" ? feedback.message : null}
                      tone="error"
                    />
                  </div>

                  {services.length === 0 ? (
                    <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-zinc-400">
                      Cadastre um serviço ativo antes de criar encaixes.
                    </p>
                  ) : (
                    <form
                      className="mt-4 space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        const formData = new FormData(form);
                        const customerName = String(formData.get("customerName") || "").trim();
                        const submittedServiceId = String(formData.get("serviceId") || "");
                        const submittedService = services.find(
                          (service) => service.id === submittedServiceId
                        );
                        const selectedStartTime = String(formData.get("startTime") || "").trim();

                        startTransition(async () => {
                          const result = await createWalkInAppointmentAction(formData);

                          setFeedback({
                            message: result.ok ? null : result.message,
                            tone: result.tone,
                          });

                          if (result.ok) {
                            form.reset();
                            setSuccessDetails({
                              customerName: customerName || "Cliente",
                              serviceName: submittedService?.name || "Serviço",
                              startTime: selectedStartTime || startTime,
                            });
                            setIsOpen(false);
                            setIsSuccessOpen(true);
                            setStartTime(
                              getSuggestedStartTime(
                                activeAppointments,
                                selectedService?.duration || defaultService?.duration || 30
                              )
                            );
                            router.refresh();
                          }
                        });
                      }}
                    >
                      <label className="block">
                        <span className="mb-2 block text-sm text-zinc-300">Cliente</span>
                        <input
                          name="customerName"
                          required
                          maxLength={80}
                          placeholder="Nome do cliente"
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--brand)]/40"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm text-zinc-300">Telefone</span>
                        <input
                          name="customerPhone"
                          maxLength={30}
                          placeholder="Opcional"
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--brand)]/40"
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                        <label className="block">
                          <span className="mb-2 block text-sm text-zinc-300">Serviço</span>
                          <select
                            name="serviceId"
                            required
                            value={selectedServiceId}
                            onChange={(event) => {
                              const nextServiceId = event.target.value;
                              const nextService = services.find(
                                (service) => service.id === nextServiceId
                              );

                              setSelectedServiceId(nextServiceId);
                              setStartTime(
                                getSuggestedStartTime(
                                  activeAppointments,
                                  nextService?.duration || 30
                                )
                              );
                            }}
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--brand)]/40"
                          >
                            {services.map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name} - {service.duration} min - {formatCurrency(service.price)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm text-zinc-300">Início</span>
                          <input
                            name="startTime"
                            type="time"
                            required
                            value={startTime}
                            onChange={(event) => setStartTime(event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--brand)]/40"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="mb-2 block text-sm text-zinc-300">Observação</span>
                        <textarea
                          name="notes"
                          rows={2}
                          maxLength={200}
                          placeholder="Opcional"
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--brand)]/40"
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="min-h-11 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.04]"
                        >
                          Fechar
                        </button>
                        <button
                          type="submit"
                          disabled={isPending}
                          className="min-h-11 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isPending ? "Criando encaixe..." : "Criar encaixe"}
                        </button>
                      </div>
                    </form>
                  )}
              </div>
            </ModalShell>,
            document.body
          )
        : null}

      {mounted && isSuccessOpen && successDetails
        ? createPortal(
            <ModalShell onClose={closeSuccessModal}>
              <div className="rounded-[28px] border border-white/10 bg-[#050b16] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-strong)]">
                      Encaixe confirmado
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Encaixe criado com sucesso!
                    </h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      O horário foi reservado e a agenda do dia já foi atualizada.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeSuccessModal}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 flex justify-center">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                    <CheckCircle2 className="h-8 w-8" />
                  </span>
                </div>

                <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                  <SummaryRow label="Cliente" value={successDetails.customerName} />
                  <SummaryRow label="Serviço" value={successDetails.serviceName} />
                  <SummaryRow label="Horário" value={successDetails.startTime} />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={closeSuccessModal}
                    className="min-h-11 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.04]"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeSuccessModal();
                      router.push("/barber");
                    }}
                    className="min-h-11 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Voltar para o painel do barbeiro
                  </button>
                </div>
              </div>
            </ModalShell>,
            document.body
          )
        : null}
    </>
  );
}

function ModalShell({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200]">
      <button
        type="button"
        aria-label="Fechar modal"
        className="absolute inset-0 bg-black/65 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="pointer-events-none fixed left-1/2 top-1/2 z-[210] w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 px-0">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-400">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}
