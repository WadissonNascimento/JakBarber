"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PremiumDatePicker, PremiumSelect } from "@/components/ui/PremiumFilters";

type Period = "week" | "month" | "custom";

export default function FinancePeriodFilters({
  period,
  start,
  end,
}: {
  period: Period;
  start: string;
  end: string;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/admin/financeiro";
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({ period, start, end });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFilters({ period, start, end });
  }, [end, period, start]);

  function applyFilters(next: typeof filters) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (next.period === "week") {
      params.delete("period");
      params.delete("start");
      params.delete("end");
    } else {
      params.set("period", next.period);

      if (next.period === "custom") {
        if (next.start) {
          params.set("start", next.start);
        } else {
          params.delete("start");
        }

        if (next.end) {
          params.set("end", next.end);
        } else {
          params.delete("end");
        }
      } else {
        params.delete("start");
        params.delete("end");
      }
    }

    startTransition(() => {
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false }
      );
    });
  }

  return (
    <form className="grid gap-4 md:grid-cols-3">
      <div>
        <PremiumSelect
          name="period"
          label="Periodo do painel"
          value={filters.period}
          options={[
            { value: "week", label: "Esta semana" },
            { value: "month", label: "Este mes" },
            { value: "custom", label: "Escolher datas" },
          ]}
          onChange={(value) => {
            const next = {
              ...filters,
              period: value as Period,
            };

            setFilters(next);
            applyFilters(next);
          }}
        />
      </div>

      <div>
        <PremiumDatePicker
          name="start"
          label="Data inicial"
          value={filters.start}
          onChange={(value) => {
            const next = {
              ...filters,
              start: value,
            };

            setFilters(next);
            if (next.period === "custom") {
              applyFilters(next);
            }
          }}
          disabled={filters.period !== "custom"}
        />
      </div>

      <div>
        <PremiumDatePicker
          name="end"
          label="Data final"
          value={filters.end}
          onChange={(value) => {
            const next = {
              ...filters,
              end: value,
            };

            setFilters(next);
            if (next.period === "custom") {
              applyFilters(next);
            }
          }}
          disabled={filters.period !== "custom"}
        />
      </div>

      <p className="text-xs text-zinc-500 md:col-span-3">
        {isPending
          ? "Atualizando os numeros..."
          : filters.period === "custom"
          ? "As datas escolhidas atualizam o painel automaticamente."
          : "Troque o periodo para atualizar o painel sem recarregar a pagina inteira."}
      </p>
    </form>
  );
}
