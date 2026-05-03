"use client";

import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import type { getBarberDashboardData } from "../data";

type BarberDashboardData = Awaited<ReturnType<typeof getBarberDashboardData>>;

export function ServicesSection({
  services,
}: {
  services: BarberDashboardData["services"];
}) {
  return (
    <SectionCard
      title="Serviços"
      description="Seus serviços aparecem aqui para consulta. Cadastros, exclusividades e ajustes agora ficam centralizados no admin."
      className="rounded-[28px] bg-zinc-900/90"
    >
      <div className="mt-6 rounded-2xl border border-sky-500/15 bg-sky-500/5 px-4 py-4 text-sm leading-6 text-zinc-300">
        O admin controla quais serviços gerais e exclusivos entram na sua agenda.
        Se precisar adicionar ou ajustar um serviço, fale com o painel administrativo.
      </div>

      <div className="mt-6 space-y-4">
        {services.length === 0 ? (
          <EmptyState
            title="Nenhum serviço liberado"
            description="Assim que o admin cadastrar serviços gerais ou exclusivos para vocé, eles vão aparecer aqui."
          />
        ) : (
          services.map((service) => (
            <div
              key={service.id}
              className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div>
                    <p className="text-lg font-semibold text-white">{service.name}</p>
                    <p className="text-sm text-zinc-400">
                      {service.isActive ? "Ativo para agendamento" : "Indisponível no momento"}
                    </p>
                  </div>

                  {service.description ? (
                    <p className="max-w-2xl text-sm leading-6 text-zinc-300">
                      {service.description}
                    </p>
                  ) : null}
                </div>

                <div className="grid min-w-[180px] gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
                  <InfoRow label="Preco" value={`R$ ${service.price.toFixed(2).replace(".", ",")}`} />
                  <InfoRow label="Duração" value={`${service.duration} min`} />
                  <InfoRow
                    label="Intervalo"
                    value={
                      service.bufferAfter > 0
                        ? `${service.bufferAfter} min`
                        : "Sem intervalo extra"
                    }
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
