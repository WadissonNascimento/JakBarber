"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  editOpenBarberAppointmentAction,
  updateAppointmentStatusAction,
} from "../actions";
import { formatCurrency } from "@/lib/utils";
import type { BarberAppointmentItemDeliveryDecision } from "./BarberAppointmentCard";

type Feedback = {
  message: string | null;
  tone: "success" | "error" | "info";
};

type BarberAppointmentActionsProps = {
  appointmentId: string;
  status: string;
  onFeedback: (feedback: Feedback) => void;
  onStatusUpdated?: (appointmentId: string, status: string) => void;
  hasPickupItems?: boolean;
  allPickupItemsReviewed?: boolean;
  itemDeliveryDecisions?: BarberAppointmentItemDeliveryDecision[];
  services?: Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
  }>;
  extras?: Array<{
    id: string;
    name: string;
    price: number;
    stock: number;
  }>;
  currentServiceIds?: string[];
  currentExtraProductIds?: string[];
  notes?: string | null;
};

export default function BarberAppointmentActions({
  appointmentId,
  status,
  onFeedback,
  onStatusUpdated,
  hasPickupItems = false,
  allPickupItemsReviewed = true,
  itemDeliveryDecisions = [],
  services = [],
  extras = [],
  currentServiceIds = [],
  currentExtraProductIds = [],
  notes = null,
}: BarberAppointmentActionsProps) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [, startTransition] = useTransition();
  const isPending = Boolean(pendingStatus);

  function submitStatus(nextStatus: string) {
    if (
      nextStatus === "COMPLETED" &&
      hasPickupItems &&
      !allPickupItemsReviewed
    ) {
      onFeedback({
        message: "Marque todas as retiradas antes de concluir.",
        tone: "error",
      });
      return;
    }

    setPendingStatus(nextStatus);
    onStatusUpdated?.(appointmentId, nextStatus);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("appointmentId", appointmentId);
      formData.set("status", nextStatus);

      if (nextStatus === "COMPLETED") {
        for (const decision of itemDeliveryDecisions) {
          formData.append(
            "itemDeliveryDecision",
            `${decision.appointmentItemId}:${decision.isDelivered ? "delivered" : "not_delivered"}`
          );
        }
      }

      const result = await updateAppointmentStatusAction(formData);
      onFeedback({ message: result.message, tone: result.tone });

      if (!result.ok) {
        onStatusUpdated?.(appointmentId, status);
      }

      router.refresh();
      setPendingStatus(null);
    });
  }

  return (
    <>
      {["PENDING", "CONFIRMED"].includes(status) ? (
        <>
          {services.length > 0 ? (
            <ActionButton
              disabled={isPending}
              pending={false}
              variant="secondary"
              onClick={() => setIsEditing(true)}
            >
              Editar
            </ActionButton>
          ) : null}
          <ActionButton
            disabled={isPending}
            pending={pendingStatus === "COMPLETED"}
            variant="primary"
            onClick={() => submitStatus("COMPLETED")}
          >
            Concluir
          </ActionButton>
        </>
      ) : null}
      {isEditing ? (
        <BarberEditAppointmentModal
          appointmentId={appointmentId}
          services={services}
          extras={extras}
          currentServiceIds={currentServiceIds}
          currentExtraProductIds={currentExtraProductIds}
          notes={notes}
          onClose={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            router.refresh();
          }}
          onFeedback={onFeedback}
        />
      ) : null}
    </>
  );
}

function BarberEditAppointmentModal({
  appointmentId,
  services,
  extras,
  currentServiceIds,
  currentExtraProductIds,
  notes,
  onClose,
  onSaved,
  onFeedback,
}: {
  appointmentId: string;
  services: NonNullable<BarberAppointmentActionsProps["services"]>;
  extras: NonNullable<BarberAppointmentActionsProps["extras"]>;
  currentServiceIds: string[];
  currentExtraProductIds: string[];
  notes: string | null;
  onClose: () => void;
  onSaved: () => void;
  onFeedback: (feedback: Feedback) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState(currentServiceIds);
  const [selectedExtraIds, setSelectedExtraIds] = useState(currentExtraProductIds);
  const total = useMemo(() => {
    const serviceTotal = services
      .filter((service) => selectedServiceIds.includes(service.id))
      .reduce((sum, service) => sum + service.price, 0);
    const extrasTotal = extras
      .filter((extra) => selectedExtraIds.includes(extra.id))
      .reduce((sum, extra) => sum + extra.price, 0);

    return serviceTotal + extrasTotal;
  }, [extras, selectedExtraIds, selectedServiceIds, services]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  }

  function toggleExtra(extraId: string) {
    setSelectedExtraIds((current) =>
      current.includes(extraId)
        ? current.filter((id) => id !== extraId)
        : [...current, extraId]
    );
  }

  function submitEdit(formData: FormData) {
    startTransition(async () => {
      const result = await editOpenBarberAppointmentAction(formData);
      onFeedback({ message: result.message, tone: result.tone });

      if (result.ok) {
        onSaved();
      }
    });
  }

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[280] flex items-center justify-center overflow-hidden overscroll-none bg-black/75 px-3 py-4 backdrop-blur-md sm:px-4 sm:py-6">
      <form
        action={submitEdit}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(18,22,32,0.98),rgba(8,12,20,0.98))] text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
      >
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <div className="border-b border-white/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
                Atendimento aberto
              </p>
              <h3 className="mt-2 text-xl font-bold">Editar itens</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Ajuste servicos, extras e observacoes antes de salvar.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-zinc-200 transition hover:bg-white/[0.06]"
            >
              Fechar
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
              Total atualizado
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-white">
              {formatCurrency(total)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
              Servicos
            </p>
            <div className="mt-2 grid gap-2">
              {services.map((service) => {
                const checked = selectedServiceIds.includes(service.id);

                return (
                  <label
                    key={service.id}
                    className={`flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                      checked
                        ? "border-[var(--brand)]/70 bg-[var(--brand-muted)]"
                        : "border-white/10 bg-white/[0.035]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="serviceIds"
                      value={service.id}
                      checked={checked}
                      onChange={() => toggleService(service.id)}
                      className="h-5 w-5 shrink-0 accent-[var(--brand)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-white">
                        {service.name}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {service.duration} min - {formatCurrency(service.price)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
              Extras
            </p>
            <div className="mt-2 grid gap-2">
              {extras.map((extra) => {
                const checked = selectedExtraIds.includes(extra.id);

                return (
                  <label
                    key={extra.id}
                    className={`flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                      checked
                        ? "border-[var(--brand)]/70 bg-[var(--brand-muted)]"
                        : "border-white/10 bg-white/[0.035]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="extraProductIds"
                      value={extra.id}
                      checked={checked}
                      onChange={() => toggleExtra(extra.id)}
                      className="h-5 w-5 shrink-0 accent-[var(--brand)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-white">
                        {extra.name}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {formatCurrency(extra.price)} - estoque {extra.stock}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="block text-sm font-semibold text-zinc-200">
            Observacoes
            <textarea
              name="notes"
              rows={4}
              maxLength={400}
              defaultValue={notes || ""}
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none transition focus:border-[var(--brand)]/70"
            />
          </label>
        </div>

        <div className="border-t border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-zinc-400">Total</span>
            <strong className="text-lg tabular-nums text-white">
              {formatCurrency(total)}
            </strong>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="min-h-12 rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.06] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="min-h-12 rounded-2xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
}

function ActionButton({
  children,
  onClick,
  pending,
  disabled,
  variant,
}: {
  children: ReactNode;
  onClick: () => void;
  pending: boolean;
  disabled: boolean;
  variant: "primary" | "secondary" | "danger";
}) {
  const classes = {
    primary: "bg-[var(--brand)] text-white hover:brightness-110",
    secondary: "border border-white/10 text-zinc-100 hover:bg-white/[0.06]",
    danger: "border border-red-500/40 text-red-200 hover:bg-red-500/10",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${classes[variant]}`}
    >
      {pending ? "Salvando..." : children}
    </button>
  );
}
