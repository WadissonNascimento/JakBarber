"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PremiumDatePicker } from "@/components/ui/PremiumFilters";

export default function BarberFinanceFilters({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    router.replace(`/barber/financeiro?${params.toString()}`);
  }

  function applyQuickRange(days: number) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    const params = new URLSearchParams(searchParams.toString());
    params.set("start", toDateValue(startDate));
    params.set("end", toDateValue(endDate));
    router.replace(`/barber/financeiro?${params.toString()}`);
  }

  function applyCurrentWeek() {
    const startDate = new Date();
    const day = startDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startDate.setDate(startDate.getDate() + diff);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const params = new URLSearchParams(searchParams.toString());
    params.set("start", toDateValue(startDate));
    params.set("end", toDateValue(endDate));
    router.replace(`/barber/financeiro?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <PremiumDatePicker
          label="Início"
          value={start}
          onChange={(value) => updateFilter("start", value)}
        />
        <PremiumDatePicker
          label="Fim"
          value={end}
          onChange={(value) => updateFilter("end", value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <QuickRangeButton onClick={applyCurrentWeek}>Semana atual</QuickRangeButton>
        <QuickRangeButton onClick={() => applyQuickRange(7)}>7 dias</QuickRangeButton>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <QuickRangeButton onClick={() => applyQuickRange(30)}>30 dias</QuickRangeButton>
        <QuickRangeButton onClick={() => applyQuickRange(90)}>90 dias</QuickRangeButton>
      </div>
    </div>
  );
}

function QuickRangeButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-10 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:border-[var(--brand)]/45 hover:bg-[var(--brand-muted)] hover:text-white"
    >
      {children}
    </button>
  );
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
