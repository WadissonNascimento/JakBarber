"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import EmptyState from "@/components/ui/EmptyState";
import { PremiumDatePicker, PremiumSelect } from "@/components/ui/PremiumFilters";
import SectionCard from "@/components/ui/SectionCard";
import {
  createCouponAction,
  deleteCouponAction,
  toggleCouponAction,
  updateCouponAction,
} from "./actions";

type CouponItem = {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minOrderTotal: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  expiresAt: Date | null;
  isActive: boolean;
  timesUsed: number;
};

export default function AdminCouponsClient({
  coupons,
}: {
  coupons: CouponItem[];
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
    <>
      <div className="mb-6 space-y-3">
        <FeedbackMessage message={feedback.message} tone={feedback.tone} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <SectionCard
          title="Novo cupom"
          description="Defina regra, validade e limite de uso."
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;

              runAction("create-coupon", createCouponAction, new FormData(form), () => form.reset());
            }}
          >
            <Field label="Código">
              <input
                name="code"
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
              />
            </Field>

            <Field label="Descrição">
              <input
                name="description"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo">
                <PremiumSelect
                  name="discountType"
                  defaultValue="PERCENT"
                  options={[
                    { value: "PERCENT", label: "Percentual" },
                    { value: "FIXED", label: "Valor fixo" },
                  ]}
                />
              </Field>

              <Field label="Valor do desconto">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  name="discountValue"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pedido minimo">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="minOrderTotal"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
                />
              </Field>

              <Field label="Desconto maximo">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="maxDiscount"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Limite de usos">
                <input
                  type="number"
                  min="1"
                  step="1"
                  name="usageLimit"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
                />
              </Field>

              <Field label="Válido até">
                <PremiumDatePicker
                  name="expiresAt"
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={isPending && pendingKey === "create-coupon"}
              className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && pendingKey === "create-coupon" ? "Criando..." : "Criar cupom"}
            </button>
          </form>
        </SectionCard>

        <div className="space-y-4">
          {coupons.length === 0 ? (
            <EmptyState
              title="Nenhum cupom cadastrado"
              description="Os cupons promocionais aparecerão aqui."
            />
          ) : (
            coupons.map((coupon) => (
              <SectionCard
                key={coupon.id}
                title={coupon.code}
                description={`${coupon.discountType === "PERCENT" ? `${coupon.discountValue}%` : `R$ ${coupon.discountValue.toFixed(2)}`} de desconto`}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
                  <div>
                    <p>Usos: {coupon.timesUsed}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</p>
                    <p>Minimo: R$ {coupon.minOrderTotal.toFixed(2)}</p>
                    <p>
                      Validade:{" "}
                      {coupon.expiresAt
                        ? new Date(coupon.expiresAt).toLocaleDateString("pt-BR")
                        : "Sem validade"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isPending && pendingKey === `toggle-${coupon.id}`}
                      onClick={() => {
                        const formData = new FormData();
                        formData.set("couponId", coupon.id);
                        runAction(`toggle-${coupon.id}`, toggleCouponAction, formData);
                      }}
                      className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending && pendingKey === `toggle-${coupon.id}`
                        ? "Salvando..."
                        : coupon.isActive
                        ? "Desativar"
                        : "Ativar"}
                    </button>

                    <button
                      type="button"
                      disabled={isPending && pendingKey === `delete-${coupon.id}`}
                      onClick={() => {
                        if (!window.confirm("Excluir este cupom?")) {
                          return;
                        }

                        const formData = new FormData();
                        formData.set("couponId", coupon.id);
                        runAction(`delete-${coupon.id}`, deleteCouponAction, formData);
                      }}
                      className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending && pendingKey === `delete-${coupon.id}`
                        ? "Excluindo..."
                        : "Excluir"}
                    </button>
                  </div>
                </div>

                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    runAction(
                      `update-${coupon.id}`,
                      updateCouponAction,
                      new FormData(event.currentTarget)
                    );
                  }}
                >
                  <input type="hidden" name="couponId" value={coupon.id} />

                  <Field label="Descrição">
                    <input
                      name="description"
                      defaultValue={coupon.description || ""}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
                    />
                  </Field>

                  <Field label="Tipo">
                    <PremiumSelect
                      name="discountType"
                      defaultValue={coupon.discountType}
                      options={[
                        { value: "PERCENT", label: "Percentual" },
                        { value: "FIXED", label: "Valor fixo" },
                      ]}
                    />
                  </Field>

                  <Field label="Valor do desconto">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      name="discountValue"
                      defaultValue={coupon.discountValue}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
                    />
                  </Field>

                  <Field label="Pedido minimo">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="minOrderTotal"
                      defaultValue={coupon.minOrderTotal}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
                    />
                  </Field>

                  <Field label="Desconto maximo">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="maxDiscount"
                      defaultValue={coupon.maxDiscount || ""}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
                    />
                  </Field>

                  <Field label="Limite de usos">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      name="usageLimit"
                      defaultValue={coupon.usageLimit || ""}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none"
                    />
                  </Field>

                  <Field label="Válido até">
                    <PremiumDatePicker
                      name="expiresAt"
                      defaultValue={
                        coupon.expiresAt
                          ? new Date(coupon.expiresAt).toISOString().slice(0, 10)
                          : ""
                      }
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={isPending && pendingKey === `update-${coupon.id}`}
                      className="rounded-xl bg-white px-4 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending && pendingKey === `update-${coupon.id}`
                        ? "Salvando..."
                        : "Salvar alteracoes"}
                    </button>
                  </div>
                </form>
              </SectionCard>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-300">{label}</span>
      {children}
    </label>
  );
}
