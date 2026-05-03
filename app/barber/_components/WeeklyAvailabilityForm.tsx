"use client";

import { useState } from "react";
import { weekDays } from "@/lib/barberSchedule";

type WeeklyAvailabilityFormProps = {
  availabilities: Array<{
    weekDay: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>;
  onSave: (formData: FormData) => void;
  isPending?: boolean;
};

type DayState = {
  weekDay: number;
  label: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export function WeeklyAvailabilityForm({
  availabilities,
  onSave,
  isPending = false,
}: WeeklyAvailabilityFormProps) {
  const availabilityMap = new Map(
    availabilities.map((item) => [item.weekDay, item] as const)
  );

  const [days, setDays] = useState<DayState[]>(
    weekDays.map((day) => ({
      weekDay: day.value,
      label: day.label,
      startTime: availabilityMap.get(day.value)?.startTime || "08:00",
      endTime: availabilityMap.get(day.value)?.endTime || "18:00",
      isActive: availabilityMap.get(day.value)?.isActive ?? false,
    }))
  );

  function updateDay(
    weekDay: number,
    patch: Partial<Pick<DayState, "startTime" | "endTime" | "isActive">>
  ) {
    setDays((current) =>
      current.map((day) =>
        day.weekDay === weekDay ? { ...day, ...patch } : day
      )
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(new FormData(event.currentTarget));
      }}
    >
      {days.map((day) => (
        <div
          key={day.weekDay}
          className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5"
        >
          <input
            type="hidden"
            name={`day-${day.weekDay}-isActive`}
            value={day.isActive ? "true" : "false"}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">{day.label}</p>
              <p className="text-sm text-zinc-400">
                {day.isActive
                  ? "Dia ativo para agendamentos."
                  : "Dia desativado. Clientes não vão ver horários aqui."}
              </p>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={day.isActive}
                onChange={(event) =>
                  updateDay(day.weekDay, { isActive: event.target.checked })
                }
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-950"
              />
              Trabalhando
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">Início</span>
              <input
                type="time"
                name={`day-${day.weekDay}-startTime`}
                value={day.startTime}
                onChange={(event) =>
                  updateDay(day.weekDay, { startTime: event.target.value })
                }
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">Fim</span>
              <input
                type="time"
                name={`day-${day.weekDay}-endTime`}
                value={day.endTime}
                onChange={(event) =>
                  updateDay(day.weekDay, { endTime: event.target.value })
                }
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none"
              />
            </label>
          </div>
        </div>
      ))}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar disponibilidade da semana"}
      </button>
    </form>
  );
}
