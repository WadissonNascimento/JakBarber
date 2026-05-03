"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createAppointmentAction } from "@/app/agendar/actions";
import FeedbackMessage from "@/components/FeedbackMessage";
import { initialFormFeedbackState } from "@/lib/formFeedbackState";

function SlotButton({ slot }: { slot: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="time"
      value={slot}
      disabled={pending}
      className="min-h-12 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Reservando..." : slot}
    </button>
  );
}

export default function AppointmentSlotForm({
  barberId,
  serviceIds,
  date,
  slots,
}: {
  barberId: string;
  serviceIds: string[];
  date: string;
  slots: string[];
}) {
  const [state, formAction] = useFormState(
    createAppointmentAction,
    initialFormFeedbackState
  );
  const formState = state ?? initialFormFeedbackState;

  return (
    <form action={formAction}>
      <input type="hidden" name="barberId" value={barberId} />
      <input type="hidden" name="serviceIds" value={serviceIds.join(",")} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="notes" value="" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {slots.map((slot) => (
          <SlotButton key={slot} slot={slot} />
        ))}
      </div>

      <div className="mt-4">
        <FeedbackMessage message={formState.error} tone="error" />
      </div>
    </form>
  );
}
