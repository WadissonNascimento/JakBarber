"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import EmptyState from "@/components/ui/EmptyState";
import { PremiumDateTimePicker } from "@/components/ui/PremiumFilters";
import SectionCard from "@/components/ui/SectionCard";
import { weekDays } from "@/lib/barberSchedule";
import { WeeklyAvailabilityForm } from "./WeeklyAvailabilityForm";
import {
  createBarberBlockAction,
  createRecurringBarberBlockAction,
  deleteBarberBlockAction,
  deleteRecurringBarberBlockAction,
  saveWeeklyBarberAvailabilityAction,
} from "../actions";
import type { getBarberDashboardData } from "../data";

type BarberDashboardData = Awaited<ReturnType<typeof getBarberDashboardData>>;

export function AvailabilitySection({
  availabilities,
  blocks,
  recurringBlocks,
}: {
  availabilities: BarberDashboardData["availabilities"];
  blocks: BarberDashboardData["blocks"];
  recurringBlocks: BarberDashboardData["recurringBlocks"];
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
    formData: FormData,
    onSuccess?: () => void
  ) {
    setPendingKey(key);

    startTransition(async () => {
      const result = await action(formData);
      setFeedback({ message: result.message, tone: result.tone });

      if (result.ok) {
        onSuccess?.();
        router.refresh();
      }

      setPendingKey(null);
    });
  }

  return (
    <SectionCard
      title="Disponibilidade"
      description="Abra horários e bloqueie pausas quando precisar."
      className="rounded-[28px] bg-zinc-900/90"
    >
      <div className="mt-6 space-y-3">
        <FeedbackMessage message={feedback.message} tone={feedback.tone} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <WeeklyAvailabilityForm
          availabilities={availabilities}
          isPending={isPending && pendingKey === "weekly-availability"}
          onSave={(formData) =>
            runAction("weekly-availability", saveWeeklyBarberAvailabilityAction, formData)
          }
        />

        <div className="space-y-4">
          <form
            className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;

              runAction(
                "create-block",
                createBarberBlockAction,
                new FormData(form),
                () => form.reset()
              );
            }}
          >
            <h3 className="text-lg font-semibold text-white">Bloquear período</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Use para folga, pausa, almoço ou qualquer indisponibilidade.
            </p>

            <div className="mt-4 space-y-4">
              <label className="block">
                <PremiumDateTimePicker
                  name="startDateTime"
                  label="Início"
                  required
                />
              </label>

              <label className="block">
                <PremiumDateTimePicker
                  name="endDateTime"
                  label="Fim"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-zinc-300">Motivo</span>
                <input
                  name="reason"
                  placeholder="Ex.: almoço, curso, folga"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={isPending && pendingKey === "create-block"}
                className="w-full rounded-xl bg-[var(--brand)] px-4 py-3 font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending && pendingKey === "create-block"
                  ? "Bloqueando..."
                  : "Bloquear horário"}
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
            <h3 className="text-lg font-semibold text-white">Bloqueios futuros</h3>

            <div className="mt-4 space-y-3">
              {blocks.length === 0 ? (
                <EmptyState
                  title="Nenhum bloqueio futuro"
                  description="Use bloqueios para almoço, folga, curso ou qualquer pausa pontual."
                />
              ) : (
                blocks.map((block) => (
                  <div
                    key={block.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
                  >
                    <p className="text-sm font-medium text-white">
                      {new Date(block.startDateTime).toLocaleString("pt-BR")} até{" "}
                      {new Date(block.endDateTime).toLocaleString("pt-BR")}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {block.reason || "Sem motivo informado"}
                    </p>

                    <button
                      type="button"
                      disabled={isPending && pendingKey === `block-${block.id}`}
                      onClick={() => {
                        if (!window.confirm("Remover este bloqueio de horário?")) {
                          return;
                        }

                        const formData = new FormData();
                        formData.set("blockId", block.id);
                        runAction(`block-${block.id}`, deleteBarberBlockAction, formData);
                      }}
                      className="mt-3 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending && pendingKey === `block-${block.id}`
                        ? "Removendo..."
                        : "Remover bloqueio"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <form
            className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;

              runAction(
                "recurring-block",
                createRecurringBarberBlockAction,
                new FormData(form),
                () => form.reset()
              );
            }}
          >
            <h3 className="text-lg font-semibold text-white">Bloqueio recorrente</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Use para almoço, pausa fixa ou horários indisponíveis que se repetem toda semana.
            </p>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-zinc-300">Dia da semana</span>
                <select
                  name="weekDay"
                  defaultValue=""
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {weekDays.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-300">Início</span>
                  <input
                    type="time"
                    name="startTime"
                    required
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-300">Fim</span>
                  <input
                    type="time"
                    name="endTime"
                    required
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm text-zinc-300">Motivo</span>
                <input
                  name="reason"
                  placeholder="Ex.: almoço fixo"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={isPending && pendingKey === "recurring-block"}
                className="w-full rounded-xl bg-[var(--brand)] px-4 py-3 font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending && pendingKey === "recurring-block"
                  ? "Criando..."
                  : "Criar bloqueio recorrente"}
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
            <h3 className="text-lg font-semibold text-white">Bloqueios recorrentes</h3>

            <div className="mt-4 space-y-3">
              {recurringBlocks.length === 0 ? (
                <EmptyState
                  title="Nenhum bloqueio recorrente"
                  description="Configure pausas fixas da semana para evitar reservas nesses periodos."
                />
              ) : (
                recurringBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
                  >
                    <p className="text-sm font-medium text-white">
                      {weekDays.find((day) => day.value === block.weekDay)?.label || "Dia"}:{" "}
                      {block.startTime} até {block.endTime}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {block.reason || "Sem motivo informado"}
                    </p>

                    <button
                      type="button"
                      disabled={isPending && pendingKey === `recurring-${block.id}`}
                      onClick={() => {
                        if (!window.confirm("Remover este bloqueio recorrente?")) {
                          return;
                        }

                        const formData = new FormData();
                        formData.set("recurringBlockId", block.id);
                        runAction(
                          `recurring-${block.id}`,
                          deleteRecurringBarberBlockAction,
                          formData
                        );
                      }}
                      className="mt-3 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending && pendingKey === `recurring-${block.id}`
                        ? "Removendo..."
                        : "Remover bloqueio recorrente"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
