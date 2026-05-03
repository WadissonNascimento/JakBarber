"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import SectionCard from "@/components/ui/SectionCard";
import {
  EXTRA_CATEGORY_OPTIONS,
  getExtraCategoryLabel,
} from "@/lib/extraCategories";
import { prepareProductImageUpload } from "@/lib/productImageClient";
import { createExtraProductFromForm } from "@/app/actions/extraProductActions";
import ExtraProductCardClient from "./ExtraProductCardClient";

type AdminExtrasClientProps = {
  extras: Array<{
    id: string;
    name: string;
    description: null | string;
    category: string;
    price: number;
    commissionType: string;
    commissionValue: number;
    isActive: boolean;
    stock: number;
    imageUrl: null | string;
    stockMovements: Array<{
      id: string;
      createdAt: Date;
      type: string;
      quantity: number;
      reason: null | string;
    }>;
  }>;
};

export default function AdminExtrasClient({ extras }: AdminExtrasClientProps) {
  const [feedback, setFeedback] = useState<{
    message: null | string;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [isPending, startTransition] = useTransition();
  const [imageUpload, setImageUpload] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);

  const activeExtras = extras.filter((extra) => extra.isActive).length;
  const lowStockExtras = extras.filter((extra) => extra.stock > 0 && extra.stock <= 3).length;
  const outOfStockExtras = extras.filter((extra) => extra.stock === 0).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Extras ativos" description="Itens liberados no agendamento.">
          <p className="text-3xl font-semibold text-white">{activeExtras}</p>
        </SectionCard>
        <SectionCard title="Estoque baixo" description="Itens com 3 unidades ou menos.">
          <p className="text-3xl font-semibold text-amber-300">{lowStockExtras}</p>
        </SectionCard>
        <SectionCard title="Sem estoque" description="Não aparecem para o cliente.">
          <p className="text-3xl font-semibold text-rose-300">{outOfStockExtras}</p>
        </SectionCard>
      </div>

      <SectionCard
        title="Extras do agendamento"
        description="Cadastre bebidas, pomadas, gel e itens simples usados no atendimento."
      >
        <FeedbackMessage message={feedback.message} tone={feedback.tone} />

        <form
          className="mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            if (imageUpload) {
              formData.set("image", imageUpload.file);
            }

            startTransition(async () => {
              try {
                await createExtraProductFromForm(formData);
                setFeedback({
                  message: "Extra cadastrado com sucesso.",
                  tone: "success",
                });
                setImageUpload((current) => {
                  if (current?.previewUrl) {
                    URL.revokeObjectURL(current.previewUrl);
                  }
                  return null;
                });
                event.currentTarget.reset();
              } catch (error) {
                setFeedback({
                  message:
                    error instanceof Error
                      ? error.message
                      : "Não foi possível cadastrar o extra.",
                  tone: "error",
                });
              }
            });
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Nome</span>
              <input
                name="name"
                required
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
                placeholder="Ex.: Agua sem gas"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Categoria</span>
              <select
                name="category"
                defaultValue="OTHER"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
              >
                {EXTRA_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2 text-sm text-zinc-300">
            <span>Descrição</span>
            <textarea
              name="description"
              rows={2}
              className="min-h-20 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
              placeholder="Opcional"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Preco</span>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
                placeholder="0.00"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Estoque</span>
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                required
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
                placeholder="0"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Comissão</span>
              <select
                name="commissionType"
                defaultValue="PERCENT"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
              >
                <option value="PERCENT">Percentual</option>
                <option value="FIXED">Valor fixo</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Valor comissão</span>
              <input
                name="commissionValue"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                required
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
                placeholder="0"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Imagem opcional</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={async (event) => {
                  const file = event.currentTarget.files?.[0];
                  if (!file) {
                    setImageUpload(null);
                    return;
                  }

                  try {
                    const prepared = await prepareProductImageUpload(file);
                    setImageUpload((current) => {
                      if (current?.previewUrl) {
                        URL.revokeObjectURL(current.previewUrl);
                      }
                      return prepared;
                    });
                  } catch (error) {
                    event.currentTarget.value = "";
                    setImageUpload(null);
                    setFeedback({
                      message:
                        error instanceof Error
                          ? error.message
                          : "Não foi possível preparar a imagem.",
                      tone: "error",
                    });
                  }
                }}
                className="max-w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-white"
              />
            </label>
          </div>

          {imageUpload ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Preview da imagem
              </p>
              <div className="relative mt-3 h-24 w-24 overflow-hidden rounded-2xl">
                <Image
                  src={imageUpload.previewUrl}
                  alt="Preview do extra"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Salvando..." : "Cadastrar extra"}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Lista atual de extras"
        description="Gerencie o que fica disponível para o cliente no agendamento."
      >
        {extras.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
            Nenhum extra cadastrado ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {extras.map((extra) => (
              <div key={extra.id} className="space-y-2">
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  {getExtraCategoryLabel(extra.category)}
                </div>
                <ExtraProductCardClient extra={extra} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
