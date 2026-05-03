"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PremiumDatePicker } from "@/components/ui/PremiumFilters";

export default function FinanceHistoryFilters({
  historyStart,
  historyEnd,
}: {
  historyStart: string;
  historyEnd: string;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/admin/financeiro";
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({ historyStart, historyEnd });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFilters({ historyStart, historyEnd });
  }, [historyEnd, historyStart]);

  function applyFilters(next: typeof filters) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (next.historyStart) {
      params.set("historyStart", next.historyStart);
    } else {
      params.delete("historyStart");
    }

    if (next.historyEnd) {
      params.set("historyEnd", next.historyEnd);
    } else {
      params.delete("historyEnd");
    }

    startTransition(() => {
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false }
      );
    });
  }

  return (
    <form className="flex flex-wrap items-end gap-3">
      <div>
        <PremiumDatePicker
          name="historyStart"
          label="De"
          value={filters.historyStart}
          onChange={(value) => {
            const next = {
              ...filters,
              historyStart: value,
            };

            setFilters(next);
            applyFilters(next);
          }}
        />
      </div>

      <div>
        <PremiumDatePicker
          name="historyEnd"
          label="Ate"
          value={filters.historyEnd}
          onChange={(value) => {
            const next = {
              ...filters,
              historyEnd: value,
            };

            setFilters(next);
            applyFilters(next);
          }}
        />
      </div>

      <p className="pb-1 text-xs text-zinc-500">
        {isPending ? "Atualizando lista..." : "A lista muda automaticamente ao trocar as datas."}
      </p>
    </form>
  );
}
