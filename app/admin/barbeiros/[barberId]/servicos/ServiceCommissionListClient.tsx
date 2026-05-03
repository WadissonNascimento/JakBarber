"use client";

import { useState, useTransition } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { upsertBarberServiceCommissionAction } from "../../actions";

type ServiceItem = {
  id: string;
  name: string;
  price: number;
  duration: number;
  barberId: string | null;
  commissionType: string;
  commissionValue: number;
  customCommission: {
    commissionType: string;
    commissionValue: number;
  } | null;
};

function formatCommission(type: string, value: number) {
  return type === "FIXED" ? formatCurrency(value) : `${value}%`;
}

export default function ServiceCommissionListClient({
  barberId,
  services,
}: {
  barberId: string;
  services: ServiceItem[];
}) {
  const [openServiceId, setOpenServiceId] = useState<string | null>(services[0]?.id || null);
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveCommission(formData: FormData, serviceId: string) {
    setPendingKey(serviceId);

    startTransition(async () => {
      const result = await upsertBarberServiceCommissionAction(formData);
      setFeedback({ message: result.message, tone: result.tone });
      setPendingKey(null);
    });
  }

  return (
    <div className="space-y-4">
      <FeedbackMessage message={feedback.message} tone={feedback.tone} />

      {services.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-400">
          Nenhum serviço disponível para esse barbeiro.
        </div>
      ) : (
        services.map((service) => {
          const isOpen = openServiceId === service.id;
          const selectedType =
            service.customCommission?.commissionType || service.commissionType || "PERCENT";
          const selectedValue =
            service.customCommission?.commissionValue ?? service.commissionValue ?? 0;

          return (
            <article
              key={service.id}
              className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,40,61,0.72),rgba(13,18,30,0.98))] shadow-[0_18px_44px_rgba(0,0,0,0.18)]"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenServiceId((current) => (current === service.id ? null : service.id))
                }
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">
                    {service.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {service.duration} min - {formatCurrency(service.price)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge variant={service.barberId ? "info" : "neutral"}>
                    {service.barberId ? "Exclusivo" : "Geral"}
                  </StatusBadge>
                  <span className="text-lg text-zinc-500">{isOpen ? "-" : "+"}</span>
                </div>
              </button>

              {isOpen ? (
                <form
                  className="border-t border-white/10 px-4 pb-4 pt-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveCommission(new FormData(event.currentTarget), service.id);
                  }}
                >
                  <input type="hidden" name="barberId" value={barberId} />
                  <input type="hidden" name="serviceId" value={service.id} />

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
                    Padrão do serviço:{" "}
                    <span className="font-semibold text-white">
                      {formatCommission(service.commissionType, service.commissionValue)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>Tipo</span>
                      <select
                        name="commissionType"
                        defaultValue={selectedType}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none focus:border-sky-400/40"
                      >
                        <option value="PERCENT">Percentual</option>
                        <option value="FIXED">Valor fixo</option>
                      </select>
                    </label>

                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>Comissão</span>
                      <input
                        name="commissionValue"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={selectedValue}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none focus:border-sky-400/40"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={isPending && pendingKey === service.id}
                      className="self-end rounded-2xl bg-[var(--brand)] px-5 py-3 font-semibold text-white shadow-[0_18px_40px_rgba(14,165,233,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending && pendingKey === service.id ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </form>
              ) : null}
            </article>
          );
        })
      )}
    </div>
  );
}
