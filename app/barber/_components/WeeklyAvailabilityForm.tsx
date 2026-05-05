"use client";

import { useState } from "react";
import { ChevronDown, Clock3, Moon, PauseCircle, Save, SunMedium } from "lucide-react";
import { PremiumTimePicker } from "@/components/ui/PremiumFilters";
import { weekDays } from "@/lib/barberSchedule";

type WeeklyAvailabilityFormProps = {
  availabilities: Array<{
    weekDay: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>;
  blocks: Array<{
    id: string;
    startDateTime: Date | string;
    endDateTime: Date | string;
    reason: string | null;
  }>;
  recurringBlocks: Array<{
    id: string;
    weekDay: number;
    startTime: string;
    endTime: string;
    reason: string | null;
  }>;
  onSave: (formData: FormData) => void;
  isPending?: boolean;
};

type DayState = {
  weekDay: number;
  label: string;
  shortLabel: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

function shortDayLabel(label: string) {
  return label.slice(0, 3).toUpperCase();
}

function formatBlockTime(value: Date | string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WeeklyAvailabilityForm({
  availabilities,
  blocks,
  recurringBlocks,
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
      shortLabel: shortDayLabel(day.label),
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
      className="rounded-[26px] border border-white/10 bg-black/20 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(new FormData(event.currentTarget));
      }}
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[var(--brand-strong)]">
              <Clock3 className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold text-white">
                Horários de atendimento
              </span>
              <span className="mt-1 block text-sm leading-5 text-zinc-400">
                Dias, horários e pausas da semana.
              </span>
            </span>
          </div>

          <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400 transition group-open:rotate-180" />
        </summary>

        <div className="border-t border-white/10 p-4 pt-4 sm:p-5">
          <div className="space-y-1.5">
            {days.map((day) => {
              const dayRecurringBlocks = recurringBlocks.filter(
                (block) => block.weekDay === day.weekDay
              );
              const dayBlocks = blocks.filter(
                (block) => new Date(block.startDateTime).getDay() === day.weekDay
              );
              const pausesCount = dayRecurringBlocks.length + dayBlocks.length;

              return (
                <details
                  key={day.weekDay}
                  className="group/day rounded-2xl border border-transparent bg-white/[0.045] transition"
                >
                  <summary className="flex min-h-[58px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 marker:hidden">
                    <input
                      type="hidden"
                      name={`day-${day.weekDay}-isActive`}
                      value={day.isActive ? "true" : "false"}
                    />

                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-10 w-12 shrink-0 items-center justify-center rounded-xl border text-[10px] font-bold uppercase tracking-[0.1em] ${
                          day.isActive
                            ? "border-white/10 bg-white/[0.06] text-zinc-100"
                            : "border-white/10 bg-white/[0.03] text-zinc-400"
                        }`}
                      >
                        {day.shortLabel}
                      </span>

                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-tight text-zinc-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            {day.startTime} até {day.endTime}
                          </span>
                          {pausesCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-zinc-300">
                              <PauseCircle className="h-3 w-3" />
                              {pausesCount} pausa{pausesCount > 1 ? "s" : ""}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </div>

                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
                          day.isActive
                            ? "border border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
                            : "border border-red-400/25 bg-red-500/10 text-red-200"
                        }`}
                      >
                        {day.isActive ? (
                          <SunMedium className="h-2.5 w-2.5" />
                        ) : (
                          <Moon className="h-2.5 w-2.5" />
                        )}
                        {day.isActive ? "Aberto" : "Bloqueado"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-zinc-500 transition group-open/day:rotate-180" />
                    </span>
                  </summary>

                  <div className="border-t border-white/10 p-3 pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        updateDay(day.weekDay, { isActive: !day.isActive })
                      }
                      className={`mb-3 min-h-11 w-full rounded-xl border px-4 py-2 text-sm font-bold transition ${
                        day.isActive
                          ? "border-red-400/25 text-red-200 hover:bg-red-500/10"
                          : "border-[var(--brand)]/35 text-[var(--brand-strong)] hover:bg-[var(--brand-muted)]"
                      }`}
                    >
                      {day.isActive ? "Fechar este dia" : "Abrir este dia"}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                          Início
                        </span>
                        <PremiumTimePicker
                          name={`day-${day.weekDay}-startTime`}
                          value={day.startTime}
                          onChange={(value) =>
                            updateDay(day.weekDay, { startTime: value })
                          }
                          required
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                          Fim
                        </span>
                        <PremiumTimePicker
                          name={`day-${day.weekDay}-endTime`}
                          value={day.endTime}
                          onChange={(value) =>
                            updateDay(day.weekDay, { endTime: value })
                          }
                          required
                        />
                      </label>
                    </div>

                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                        Pausas e bloqueios
                      </p>

                      {pausesCount === 0 ? (
                        <p className="mt-2 text-sm text-zinc-400">
                          Nenhuma pausa cadastrada para este dia.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {dayRecurringBlocks.map((block) => (
                            <p key={block.id} className="text-sm text-zinc-300">
                              Fixa: {block.startTime} até {block.endTime}
                              {block.reason ? ` - ${block.reason}` : ""}
                            </p>
                          ))}
                          {dayBlocks.map((block) => (
                            <p key={block.id} className="text-sm text-zinc-300">
                              Pontual: {formatBlockTime(block.startDateTime)} até{" "}
                              {formatBlockTime(block.endDateTime)}
                              {block.reason ? ` - ${block.reason}` : ""}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isPending ? "Salvando..." : "Salvar semana"}
          </button>
        </div>
      </details>
    </form>
  );
}
