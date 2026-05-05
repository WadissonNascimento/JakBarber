"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  CheckCircle2,
  Clock3,
  Plus,
  Scissors,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import FeedbackMessage from "@/components/FeedbackMessage";
import { PremiumTimePicker } from "@/components/ui/PremiumFilters";
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
  clients: BarberDashboardData["clients"];
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
  clients,
  activeAppointments,
}: WalkInAppointmentCardProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [pendingSummary, setPendingSummary] = useState<{
    customerName: string;
    customerPhone: string;
    serviceName: string;
    startTime: string;
    notes: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [successDetails, setSuccessDetails] = useState<WalkInSuccessDetails | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const defaultService = services[0];
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    defaultService ? [defaultService.id] : []
  );
  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [selectedServiceIds, services]
  );
  const selectedDuration = selectedServices.reduce(
    (sum, service) => sum + service.duration,
    0
  );
  const selectedTotal = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const selectedCustomer = clients.find((client) => client.id === selectedCustomerId) || null;
  const filteredClients = useMemo(() => {
    const search = clientSearch.trim().toLowerCase();

    if (!search) {
      return clients;
    }

    return clients.filter((client) =>
      [client.name, client.phone || "", client.email || ""].some((value) =>
        value.toLowerCase().includes(search)
      )
    );
  }, [clientSearch, clients]);
  const [startTime, setStartTime] = useState(() =>
    getSuggestedStartTime(activeAppointments, defaultService?.duration || 30)
  );
  const isDisabled = services.length === 0;

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

    setSelectedServiceIds((current) =>
      current.some((serviceId) => services.some((service) => service.id === serviceId))
        ? current.filter((serviceId) => services.some((service) => service.id === serviceId))
        : [defaultService.id]
    );
  }, [defaultService, services]);

  useEffect(() => {
    if (!mounted || (!isOpen && !isSuccessOpen && !isClientPickerOpen && !isConfirmOpen)) {
      return;
    }

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen, isSuccessOpen, isClientPickerOpen, isConfirmOpen, mounted]);

  function closeModal() {
    if (isPending) {
      return;
    }

    setIsOpen(false);
    setIsClientPickerOpen(false);
    setIsConfirmOpen(false);
    setPendingFormData(null);
    setPendingSummary(null);
    setFeedback({ message: null, tone: "success" });
  }

  function closeSuccessModal() {
    setIsSuccessOpen(false);
    setSuccessDetails(null);
  }

  function openWalkInModal() {
    const initialService = defaultService || services[0] || null;
    const initialServiceIds = initialService ? [initialService.id] : [];
    setSelectedCustomerId("");
    setCustomerName("");
    setCustomerPhone("");
    setClientSearch("");
    setIsClientPickerOpen(false);
    setIsConfirmOpen(false);
    setPendingFormData(null);
    setPendingSummary(null);
    setSelectedServiceIds(initialServiceIds);
    setStartTime(getSuggestedStartTime(activeAppointments, initialService?.duration || 30));
    setFeedback({ message: null, tone: "success" });
    setIsOpen(true);
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) => {
      const next = current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId];
      const nextServices = services.filter((service) => next.includes(service.id));
      const nextDuration = nextServices.reduce((sum, service) => sum + service.duration, 0);

      setStartTime(getSuggestedStartTime(activeAppointments, nextDuration || 30));
      return next;
    });
  }

  function selectExistingCustomer(customerId: string) {
    setSelectedCustomerId(customerId);

    if (!customerId) {
      return;
    }

    const customer = clients.find((client) => client.id === customerId);
    if (!customer) {
      return;
    }

    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || "");
    setClientSearch("");
    setIsClientPickerOpen(false);
  }

  function confirmWalkInCreation() {
    if (!pendingFormData || !pendingSummary) {
      return;
    }

    const formData = pendingFormData;
    const summary = pendingSummary;

    startTransition(async () => {
      const result = await createWalkInAppointmentAction(formData);

      setFeedback({
        message: result.ok ? null : result.message,
        tone: result.tone,
      });

      if (result.ok) {
        setSuccessDetails({
          customerName: summary.customerName || "Cliente",
          serviceName: summary.serviceName,
          startTime: summary.startTime || startTime,
        });
        setSelectedCustomerId("");
        setCustomerName("");
        setCustomerPhone("");
        setPendingFormData(null);
        setPendingSummary(null);
        setIsConfirmOpen(false);
        setIsOpen(false);
        setIsSuccessOpen(true);
        setStartTime(
          getSuggestedStartTime(
            activeAppointments,
            selectedDuration || defaultService?.duration || 30
          )
        );
        router.refresh();
      } else {
        setIsConfirmOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={isDisabled}
        onClick={openWalkInModal}
        className="flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="h-4 w-4 text-[var(--brand-strong)]" />
        <span>Criar encaixe</span>
      </button>

      {mounted && isOpen
        ? createPortal(
            <ModalShell onClose={closeModal}>
              <div className="max-h-[calc(100svh-2rem)] overflow-y-auto rounded-[30px] border border-white/10 bg-[#050b16] shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <div className="border-b border-white/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--brand-strong)]">
                        Encaixe
                      </p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                        Criar encaixe
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">
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
                </div>

                <div className="p-5">
                  <FeedbackMessage
                    message={feedback.tone === "error" ? feedback.message : null}
                    tone="error"
                  />

                  {services.length === 0 ? (
                    <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-zinc-400">
                      Cadastre um serviço ativo antes de criar encaixes.
                    </p>
                  ) : (
                    <form
                      className="space-y-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        const formData = new FormData(form);
                        const submittedCustomerName = String(formData.get("customerName") || "").trim();
                        const selectedStartTime = String(formData.get("startTime") || "").trim();
                        const notes = String(formData.get("notes") || "").trim();
                        const serviceName =
                          selectedServices.map((service) => service.name).join(" + ") ||
                          "Serviço";

                        setPendingFormData(formData);
                        setPendingSummary({
                          customerName: submittedCustomerName || "Cliente",
                          customerPhone: String(formData.get("customerPhone") || "").trim(),
                          serviceName,
                          startTime: selectedStartTime || startTime,
                          notes,
                        });
                        setIsConfirmOpen(true);
                      }}
                    >
                      {selectedServiceIds.map((serviceId) => (
                        <input key={serviceId} type="hidden" name="serviceIds" value={serviceId} />
                      ))}
                      <input type="hidden" name="customerId" value={selectedCustomerId} />

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                            Cliente
                          </span>
                          <input
                            name="customerName"
                            value={customerName}
                            onChange={(event) => setCustomerName(event.target.value)}
                            required
                            maxLength={80}
                            placeholder="Nome do cliente"
                            className="min-h-11 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--brand)]/40"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                            Telefone
                          </span>
                          <input
                            name="customerPhone"
                            value={customerPhone}
                            onChange={(event) => setCustomerPhone(event.target.value)}
                            maxLength={30}
                            placeholder="Opcional"
                            className="min-h-11 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--brand)]/40"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                          Cliente já cadastrado
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsClientPickerOpen(true)}
                          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left text-sm text-white transition hover:border-[var(--brand)]/45 hover:bg-white/[0.04]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-bold">
                              {selectedCustomer?.name || "Selecionar cliente"}
                            </span>
                            <span className="mt-1 block truncate text-xs text-zinc-500">
                              {selectedCustomer
                                ? selectedCustomer.phone || selectedCustomer.email || "Sem contato"
                                : "Buscar na sua base ou preencher manualmente"}
                            </span>
                          </span>
                          <Search className="h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
                        </button>
                      </label>

                      <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
                              Serviços feitos
                            </p>
                            <p className="mt-1 text-sm text-zinc-400">
                              Selecione um ou mais serviços do encaixe.
                            </p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-zinc-200">
                            {selectedServiceIds.length}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          {services.map((service) => {
                            const selected = selectedServiceIds.includes(service.id);

                            return (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => toggleService(service.id)}
                                className={`flex min-h-[58px] w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left transition ${
                                  selected
                                    ? "border-[var(--brand)]/45 bg-[var(--brand-muted)]"
                                    : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
                                }`}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                                      selected
                                        ? "border-[var(--brand)]/45 bg-[var(--brand)] text-white"
                                        : "border-white/10 bg-black/20 text-zinc-400"
                                    }`}
                                  >
                                    {selected ? (
                                      <Check className="h-3.5 w-3.5" />
                                    ) : (
                                      <Scissors className="h-3.5 w-3.5" />
                                    )}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-bold leading-tight text-white">
                                      {service.name}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] leading-tight text-zinc-400">
                                      {service.duration} min · {formatCurrency(service.price)}
                                    </span>
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-black/20 p-3">
                        <SummaryTile label="Serviços" value={String(selectedServiceIds.length)} />
                        <SummaryTile label="Duração" value={`${selectedDuration || 0} min`} />
                        <SummaryTile label="Total" value={formatCurrency(selectedTotal)} />
                      </div>

                      <label className="block">
                        <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                          Início
                        </span>
                        <PremiumTimePicker
                          name="startTime"
                          value={startTime}
                          onChange={setStartTime}
                          required
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                          Observação
                        </span>
                        <textarea
                          name="notes"
                          rows={2}
                          maxLength={200}
                          placeholder="Opcional"
                          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--brand)]/40"
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="min-h-11 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/[0.04]"
                        >
                          Fechar
                        </button>
                        <button
                          type="submit"
                          disabled={isPending || selectedServiceIds.length === 0}
                          className="min-h-11 rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isPending ? "Criando..." : "Criar encaixe"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </ModalShell>,
            document.body
          )
        : null}

      {mounted && isClientPickerOpen
        ? createPortal(
            <ClientPickerPopup
              clients={filteredClients}
              search={clientSearch}
              selectedCustomerId={selectedCustomerId}
              onSearchChange={setClientSearch}
              onSelect={selectExistingCustomer}
              onClear={() => {
                setSelectedCustomerId("");
                setCustomerName("");
                setCustomerPhone("");
                setClientSearch("");
                setIsClientPickerOpen(false);
              }}
              onClose={() => setIsClientPickerOpen(false)}
            />,
            document.body
          )
        : null}

      {mounted && isConfirmOpen && pendingSummary
        ? createPortal(
            <WalkInConfirmPopup
              summary={pendingSummary}
              duration={selectedDuration}
              total={selectedTotal}
              isPending={isPending}
              onConfirm={confirmWalkInCreation}
              onClose={() => {
                if (isPending) {
                  return;
                }

                setIsConfirmOpen(false);
                setPendingFormData(null);
                setPendingSummary(null);
              }}
            />,
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
                      Encaixe registrado
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-white">
                      Encaixe criado!
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
                  <SummaryRow label="Serviços" value={successDetails.serviceName} />
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
                    Voltar para o painel
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

function ClientPickerPopup({
  clients,
  search,
  selectedCustomerId,
  onSearchChange,
  onSelect,
  onClear,
  onClose,
}: {
  clients: WalkInAppointmentCardProps["clients"];
  search: string;
  selectedCustomerId: string;
  onSearchChange: (value: string) => void;
  onSelect: (customerId: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[260] flex touch-none items-center justify-center overflow-hidden overscroll-none bg-black/75 px-4 py-6 backdrop-blur-md"
      onWheel={(event) => event.preventDefault()}
      onTouchMove={(event) => {
        if (!(event.target as HTMLElement).closest("[data-client-picker-scroll]")) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="button"
        aria-label="Fechar seletor de cliente"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-[270] flex max-h-[calc(100svh-2rem)] w-full max-w-sm flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#050b16] shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
                Clientes
              </p>
              <h3 className="mt-1 text-xl font-black text-white">
                Selecionar cliente
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Busque na base do barbeiro.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Nome, telefone ou e-mail"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              autoFocus
            />
          </div>
        </div>

        <div
          data-client-picker-scroll
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-3"
        >
          <button
            type="button"
            onClick={onClear}
            className="mb-2 flex min-h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm font-bold text-zinc-200 transition hover:bg-white/[0.06]"
          >
            Preencher manualmente
            {!selectedCustomerId ? <Check className="h-4 w-4 text-[var(--brand-strong)]" /> : null}
          </button>

          {clients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-zinc-400">
              Nenhum cliente encontrado.
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => {
                const selected = client.id === selectedCustomerId;

                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => onSelect(client.id)}
                    className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-[var(--brand)]/45 bg-[var(--brand-muted)]"
                        : "border-white/10 bg-black/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-white">
                        {client.name}
                      </span>
                      <span className="mt-1 block truncate text-xs text-zinc-400">
                        {client.phone || client.email || "Sem contato"}
                      </span>
                    </span>
                    {selected ? (
                      <Check className="h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WalkInConfirmPopup({
  summary,
  duration,
  total,
  isPending,
  onConfirm,
  onClose,
}: {
  summary: {
    customerName: string;
    customerPhone: string;
    serviceName: string;
    startTime: string;
    notes: string;
  };
  duration: number;
  total: number;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[280] flex touch-none items-center justify-center overflow-hidden overscroll-none bg-black/75 px-4 py-6 backdrop-blur-md">
      <button
        type="button"
        aria-label="Fechar confirmação"
        className="absolute inset-0"
        onClick={onClose}
        disabled={isPending}
      />

      <div className="relative z-[290] w-full max-w-sm rounded-[28px] border border-white/10 bg-[#050b16] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
              Confirmar
            </p>
            <h3 className="mt-1 text-2xl font-black text-white">
              Criar encaixe?
            </h3>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Confira os dados antes de reservar o horário.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
          <SummaryRow label="Cliente" value={summary.customerName} />
          <SummaryRow label="Telefone" value={summary.customerPhone || "Não informado"} />
          <SummaryRow label="Serviços" value={summary.serviceName} />
          <SummaryRow label="Horário" value={summary.startTime} />
          <SummaryRow label="Duração" value={`${duration || 0} min`} />
          <SummaryRow label="Total" value={formatCurrency(total)} />
          {summary.notes ? <SummaryRow label="Obs." value={summary.notes} /> : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="min-h-11 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/[0.04] disabled:opacity-50"
          >
            Revisar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="min-h-11 rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Criando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
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
