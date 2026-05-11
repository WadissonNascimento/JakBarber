"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { updateAppointmentStatusAction } from "../actions";
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
};

export default function BarberAppointmentActions({
  appointmentId,
  status,
  onFeedback,
  onStatusUpdated,
  hasPickupItems = false,
  allPickupItemsReviewed = true,
  itemDeliveryDecisions = [],
}: BarberAppointmentActionsProps) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();
  const isPending = Boolean(pendingStatus);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isCancelOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isCancelOpen]);

  function submitStatus(nextStatus: string, reason?: string) {
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

      if (reason) {
        formData.set("cancellationReason", reason);
      }

      const result = await updateAppointmentStatusAction(formData);
      onFeedback({ message: result.message, tone: result.tone });

      if (result.ok) {
        setIsCancelOpen(false);
        setCancellationReason("");
        setCancelError(null);
        router.refresh();
      } else {
        onStatusUpdated?.(appointmentId, status);
        router.refresh();
      }

      setPendingStatus(null);
    });
  }

  function confirmCancellation() {
    const reason = cancellationReason.trim();

    if (!reason) {
      setCancelError("Informe o motivo do cancelamento.");
      return;
    }

    submitStatus("CANCELLED", reason);
  }

  return (
    <>
      {["PENDING", "CONFIRMED"].includes(status) ? (
        <ActionButton
          disabled={isPending}
          pending={pendingStatus === "COMPLETED"}
          variant="primary"
          onClick={() => submitStatus("COMPLETED")}
        >
          Concluir
        </ActionButton>
      ) : null}

      {["PENDING", "CONFIRMED"].includes(status) ? (
        <ActionButton
          disabled={isPending}
          pending={pendingStatus === "CANCELLED"}
          variant="danger"
          onClick={() => {
            setCancelError(null);
            setIsCancelOpen(true);
          }}
        >
          Cancelar
        </ActionButton>
      ) : null}

      {mounted && isCancelOpen
        ? createPortal(
        <div
          className="fixed inset-0 z-[280] flex touch-none items-center justify-center overflow-hidden overscroll-none bg-black/75 px-4 py-6 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Motivo do cancelamento"
          onWheel={(event) => event.preventDefault()}
          onTouchMove={(event) => event.preventDefault()}
        >
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(18,22,32,0.98),rgba(8,12,20,0.98))] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
              Cancelamento
            </p>
            <h3 className="mt-2 text-xl font-bold">
              Qual o motivo do cancelamento?
            </h3>
            <p className="mt-2 text-sm leading-5 text-zinc-400">
              Esse motivo ficará registrado no agendamento para manter o
              histórico claro.
            </p>

            <textarea
              value={cancellationReason}
              onChange={(event) => {
                setCancellationReason(event.target.value);
                setCancelError(null);
              }}
              rows={4}
              maxLength={240}
              placeholder="Ex.: cliente pediu para remarcar, não conseguiu comparecer..."
              className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--brand)]/60"
            />

            {cancelError ? (
              <p className="mt-2 text-sm text-red-300">{cancelError}</p>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setIsCancelOpen(false);
                  setCancellationReason("");
                  setCancelError(null);
                }}
                className="min-h-11 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={confirmCancellation}
                className="min-h-11 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingStatus === "CANCELLED" ? "Cancelando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
          )
        : null}
    </>
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
  variant: "primary" | "danger";
}) {
  const classes = {
    primary: "bg-[var(--brand)] text-white hover:brightness-110",
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
