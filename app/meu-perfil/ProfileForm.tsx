"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import { PremiumSelect } from "@/components/ui/PremiumFilters";
import { updateCustomerProfileAction } from "./actions";

type BarberOption = {
  id: string;
  name: string | null;
};

export default function ProfileForm({
  customer,
  profile,
  barbers,
}: {
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  profile: {
    preferredBarberId: string | null;
    allergies: string | null;
    preferences: string | null;
  } | null;
  barbers: BarberOption[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await updateCustomerProfileAction(formData);
          setFeedback({ message: result.message, tone: result.tone });

          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <div className="space-y-3">
        <FeedbackMessage message={feedback.message} tone={feedback.tone} />
      </div>

      <label className="block">
        <span className="mb-2 block text-sm text-zinc-300">Nome</span>
        <input
          name="name"
          defaultValue={customer.name || ""}
          required
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-zinc-300">E-mail</span>
        <input
          value={customer.email || ""}
          readOnly
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-400 outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-zinc-300">Telefone</span>
        <input
          name="phone"
          defaultValue={customer.phone || ""}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none"
        />
      </label>

      <label className="block">
        <PremiumSelect
          name="preferredBarberId"
          label="Barbeiro preferido"
          defaultValue={profile?.preferredBarberId || ""}
          options={[
            { value: "", label: "Sem preferência" },
            ...barbers.map((barber) => ({
              value: barber.id,
              label: barber.name || "Barbeiro",
            })),
          ]}
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-zinc-300">Alergias ou cuidados</span>
        <textarea
          name="allergies"
          rows={3}
          defaultValue={profile?.allergies || ""}
          placeholder="Ex.: sensibilidade a determinados produtos"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-zinc-300">Preferências</span>
        <textarea
          name="preferences"
          rows={3}
          defaultValue={profile?.preferences || ""}
          placeholder="Ex.: estilo de corte, acabamento, horário favorito"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}
