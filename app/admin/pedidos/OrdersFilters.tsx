"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PremiumDatePicker, PremiumSelect } from "@/components/ui/PremiumFilters";

export default function OrdersFilters({
  dateFrom,
  dateTo,
  status,
  statusOptions,
}: {
  dateFrom: string;
  dateTo: string;
  status: string;
  statusOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/admin/pedidos";
  const [filters, setFilters] = useState({ dateFrom, dateTo, status });
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 md:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams();

        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);
        if (filters.status) params.set("status", filters.status);

        startTransition(() => {
          router.replace(
            params.toString() ? `${pathname}?${params.toString()}` : pathname,
            { scroll: false }
          );
        });
      }}
    >
      <div>
        <PremiumDatePicker
          name="dateFrom"
          label="De"
          value={filters.dateFrom}
          onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))}
        />
      </div>

      <div>
        <PremiumDatePicker
          name="dateTo"
          label="Ate"
          value={filters.dateTo}
          onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))}
        />
      </div>

      <div>
        <PremiumSelect
          name="status"
          label="Status"
          value={filters.status}
          onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
          options={[{ value: "", label: "Todos" }, ...statusOptions]}
        />
      </div>

      <div className="flex items-end">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Filtrando..." : "Filtrar"}
        </button>
      </div>
    </form>
  );
}
