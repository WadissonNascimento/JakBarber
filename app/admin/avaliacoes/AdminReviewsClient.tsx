"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import EmptyState from "@/components/ui/EmptyState";
import CrownRating from "@/components/ui/CrownRating";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  deleteReviewAction,
  toggleReviewVisibilityAction,
} from "./actions";

type ReviewItem = {
  id: string;
  rating: number;
  comment: string;
  isVisible: boolean;
  createdAt: Date;
  customer: {
    name: string | null;
    email: string | null;
  };
  barber: {
    name: string | null;
  };
};

export default function AdminReviewsClient({
  reviews,
}: {
  reviews: ReviewItem[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(
    key: string,
    action: (formData: FormData) => Promise<{
      ok: boolean;
      message: string;
      tone: "success" | "error" | "info";
    }>,
    formData: FormData
  ) {
    setPendingKey(key);

    startTransition(async () => {
      const result = await action(formData);
      setFeedback({ message: result.message, tone: result.tone });

      if (result.ok) {
        router.refresh();
      }

      setPendingKey(null);
    });
  }

  return (
    <div className="space-y-4">
      <FeedbackMessage message={feedback.message} tone={feedback.tone} />

      {reviews.length === 0 ? (
        <EmptyState
          title="Nenhuma avaliação recebida"
          description="As avaliações aparecem aqui depois que clientes avaliarem atendimentos concluídos."
        />
      ) : (
        reviews.map((review) => (
          <article
            key={review.id}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge variant={review.isVisible ? "success" : "neutral"}>
                    {review.isVisible ? "Pública" : "Oculta"}
                  </StatusBadge>
                  <CrownRating rating={review.rating} size="sm" />
                </div>
                <p className="mt-3 break-words text-sm leading-6 text-zinc-300">
                  {review.comment}
                </p>
                <p className="mt-4 text-sm font-semibold text-white">
                  {review.customer.name || review.customer.email || "Cliente"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Barbeiro: {review.barber.name || "Barbeiro"} -{" "}
                  {new Date(review.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:min-w-[160px]">
                <button
                  type="button"
                  disabled={isPending && pendingKey === `toggle-${review.id}`}
                  onClick={() => {
                    const formData = new FormData();
                    formData.set("reviewId", review.id);
                    runAction(
                      `toggle-${review.id}`,
                      toggleReviewVisibilityAction,
                      formData
                    );
                  }}
                  className="min-h-11 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending && pendingKey === `toggle-${review.id}`
                    ? "Salvando..."
                    : review.isVisible
                    ? "Ocultar"
                    : "Publicar"}
                </button>

                <button
                  type="button"
                  disabled={isPending && pendingKey === `delete-${review.id}`}
                  onClick={() => {
                    if (!window.confirm("Excluir esta avaliação definitivamente?")) {
                      return;
                    }

                    const formData = new FormData();
                    formData.set("reviewId", review.id);
                    runAction(`delete-${review.id}`, deleteReviewAction, formData);
                  }}
                  className="min-h-11 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending && pendingKey === `delete-${review.id}`
                    ? "Excluindo..."
                    : "Excluir"}
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
