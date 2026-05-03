"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import CrownRating from "@/components/ui/CrownRating";
import { submitAppointmentReviewAction } from "./actions";

export default function ReviewForm({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await submitAppointmentReviewAction(formData);
          setFeedback({ message: result.message, tone: result.tone });

          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="mb-3">
        <p className="text-sm font-semibold text-white">
          Como foi seu atendimento?
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Sua avaliação pode aparecer na página inicial da barbearia.
        </p>
      </div>

      <CrownRating
        rating={rating}
        size="lg"
        interactive
        disabled={isPending}
        onSelect={setRating}
      />

      <label className="mt-3 block">
        <span className="mb-2 block text-sm text-zinc-300">Comentario</span>
        <textarea
          name="comment"
          value={comment}
          onChange={(event) => setComment(event.target.value.slice(0, 400))}
          rows={3}
          maxLength={400}
          disabled={isPending}
          placeholder="Conte como foi o atendimento..."
          className="w-full resize-none rounded-lg border border-white/10 bg-[#07101f] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--brand)]/60 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span className="mt-1 block text-right text-xs text-zinc-500">
          {comment.length}/400
        </span>
      </label>

      <div className="mt-3">
        <FeedbackMessage message={feedback.message} tone={feedback.tone} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-3 w-full rounded-lg bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isPending
          ? "Salvando..."
          : "Enviar avaliação"}
      </button>
    </form>
  );
}
