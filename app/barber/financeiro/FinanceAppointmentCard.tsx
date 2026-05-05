"use client";

import { useState } from "react";
import { CheckCircle2, DollarSign, Scissors, ShoppingBag } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
} from "@/lib/appointmentStatus";
import { formatAppointmentPublicId } from "@/lib/appointmentPublicId";
import { formatScheduleDate, formatScheduleTime } from "@/lib/scheduleTime";
import { formatCurrency } from "@/lib/utils";

export type FinanceAppointmentCardData = {
  id: string;
  publicId: number;
  date: Date;
  status: string;
  customerName: string;
  serviceName: string;
  services: Array<{
    id: string;
    name: string;
    price: number;
    payout: number;
  }>;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    subtotal: number;
    payout: number;
    isDelivered: boolean;
  }>;
  servicePayout: number;
  deliveredItemsPayout: number;
  payoutTotal: number;
  grossTotal: number;
};

export default function FinanceAppointmentCard({
  appointment,
}: {
  appointment: FinanceAppointmentCardData;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const muted = ["CANCELLED", "NO_SHOW"].includes(appointment.status);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={() => setIsExpanded((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setIsExpanded((current) => !current);
        }
      }}
      className="cursor-pointer overflow-hidden rounded-[22px] border border-white/10 bg-black/25 p-3.5 shadow-[0_18px_44px_rgba(0,0,0,0.16)] transition hover:border-[var(--brand)]/35 hover:bg-white/[0.035]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            {formatAppointmentPublicId(appointment.publicId)}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-[26px] font-black leading-none text-white">
              {formatScheduleTime(appointment.date)}
            </p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
              {formatScheduleDate(appointment.date, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
          </div>
          <p className="mt-2 truncate text-base font-bold text-white">
            {appointment.customerName}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
            {appointment.serviceName || "Atendimento"}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge
            variant={appointmentStatusVariant(appointment.status)}
            className="px-2.5 py-1 text-[10px]"
          >
            {appointmentStatusLabel(appointment.status)}
          </StatusBadge>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-emerald-300/70" />
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200/80">
              Repasse
            </p>
            <p className="mt-0.5 text-base font-black leading-none text-white">
              {formatCurrency(muted ? 0 : appointment.payoutTotal)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <BreakdownPill
          icon={<Scissors />}
          label="Serviços"
          value={formatCurrency(muted ? 0 : appointment.servicePayout)}
        />
        <BreakdownPill
          icon={<ShoppingBag />}
          label="Retiradas"
          value={formatCurrency(muted ? 0 : appointment.deliveredItemsPayout)}
        />
        <BreakdownPill
          icon={<DollarSign />}
          label="Vendido"
          value={formatCurrency(muted ? 0 : appointment.grossTotal)}
        />
      </div>

      {isExpanded ? (
        <div
          className="mt-3 space-y-2"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Serviços do atendimento
            </p>
            <div className="mt-2 space-y-1.5">
              {appointment.services.map((service) => (
                <FinanceLine
                  key={service.id}
                  label={service.name}
                  value={formatCurrency(service.payout)}
                  helper={`Valor cobrado: ${formatCurrency(service.price)}`}
                />
              ))}
            </div>
          </div>

          {appointment.items.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                Itens retirados no local
              </p>
              <div className="mt-2 space-y-1.5">
                {appointment.items.map((item) => (
                  <FinanceLine
                    key={item.id}
                    label={`${item.name} x${item.quantity}`}
                    value={formatCurrency(item.isDelivered ? item.payout : 0)}
                    helper={
                      item.isDelivered
                        ? `Entregue - venda ${formatCurrency(item.subtotal)}`
                        : "Não entregue - não entra no repasse"
                    }
                    checked={item.isDelivered}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function BreakdownPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-2">
      <div className="flex min-w-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500">
        <span className="text-[var(--brand-strong)] [&>svg]:h-3.5 [&>svg]:w-3.5">
          {icon}
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <p className="mt-1.5 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function FinanceLine({
  label,
  value,
  helper,
  checked,
}: {
  label: string;
  value: string;
  helper: string;
  checked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {checked ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
          ) : null}
          <p className="truncate text-sm font-bold text-white">{label}</p>
        </div>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">{helper}</p>
      </div>
      <p className="shrink-0 text-sm font-black text-[var(--brand-strong)]">
        {value}
      </p>
    </div>
  );
}
