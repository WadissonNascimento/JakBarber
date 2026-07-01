"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import FeedbackMessage from "@/components/FeedbackMessage";
import SubmitButton from "@/components/SubmitButton";
import type { MutationResult } from "@/lib/mutationResult";
import { createBarberAdvanceAction } from "./actions";

const initialState: MutationResult | null = null;

export default function BarberAdvanceForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(createBarberAdvanceAction, initialState);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      {state ? <FeedbackMessage message={state.message} tone={state.tone} /> : null}

      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          Valor do vale
        </span>
        <input
          name="amount"
          type="text"
          required
          inputMode="decimal"
          placeholder="Ex: 150,00"
          className="min-h-12 rounded-2xl border border-white/10 bg-black/25 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--brand)]/50 focus:ring-2 focus:ring-[var(--brand)]/15"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          Motivo
        </span>
        <textarea
          name="reason"
          rows={4}
          required
          maxLength={500}
          placeholder="Ex: vale para transporte, adiantamento semanal..."
          className="resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--brand)]/50 focus:ring-2 focus:ring-[var(--brand)]/15"
        />
      </label>

      <SubmitButton idleText="Anotar vale" loadingText="Salvando..." />
    </form>
  );
}
