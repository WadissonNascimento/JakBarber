"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import { confirmOrder, deleteOrder, saveTrackingCode } from "@/app/actions/orderActions";

export default function OrderActionPanel({
  orderId,
  status,
  trackingCode,
}: {
  orderId: string;
  status: string;
  trackingCode: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState(trackingCode || "");
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(
    key: string,
    action: () => Promise<void>,
    successMessage: string
  ) {
    setPendingKey(key);
    startTransition(async () => {
      try {
        await action();
        setFeedback({ message: successMessage, tone: "success" });
        router.refresh();
      } catch (error) {
        setFeedback({
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível atualizar o pedido.",
          tone: "error",
        });
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <>
      <div className="space-y-3">
        <FeedbackMessage message={feedback.message} tone={feedback.tone} />
      </div>

      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && (
          <button
            type="button"
            disabled={isPending && pendingKey === "confirm"}
            onClick={() =>
              runAction("confirm", () => confirmOrder(orderId), "Pedido confirmado com sucesso.")
            }
            className="rounded bg-green-600 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending && pendingKey === "confirm" ? "Aceitando..." : "Aceitar"}
          </button>
        )}

        <button
          type="button"
          disabled={isPending && pendingKey === "delete"}
          onClick={() =>
            runAction("delete", () => deleteOrder(orderId), "Pedido excluido com sucesso.")
          }
          className="rounded bg-red-600 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && pendingKey === "delete" ? "Excluindo..." : "Excluir"}
        </button>
      </div>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          runAction(
            "tracking",
            () => saveTrackingCode(orderId, code),
            "Código de rastreio salvo com sucesso."
          );
        }}
      >
        <input
          name="trackingCode"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Código de rastreio"
          className="min-w-[240px] rounded bg-black px-3 py-2 text-white outline-none"
        />
        <button
          type="submit"
          disabled={isPending && pendingKey === "tracking"}
          className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && pendingKey === "tracking" ? "Salvando..." : "Salvar rastreio"}
        </button>
      </form>
    </>
  );
}
