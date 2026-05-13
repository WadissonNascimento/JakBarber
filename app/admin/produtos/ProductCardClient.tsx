"use client";

/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  PRODUCT_CATEGORY_OPTIONS,
  getProductCategoryLabel,
} from "@/lib/productCategories";
import { sanitizeTextInput, sanitizeTextareaInput } from "@/lib/inputSanitization";
import { prepareProductImageUpload } from "@/lib/productImageClient";
import {
  deleteProduct,
  toggleProduct,
  updateProductFromForm,
} from "@/app/actions/productActions";

type PreparedImageUpload = {
  file: File;
  previewUrl: string;
};

type ProductCardClientProps = {
  product: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    price: number;
    isActive: boolean;
    stock: number;
    imageUrl: string | null;
  };
};

export default function ProductCardClient({ product }: ProductCardClientProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isActive, setIsActive] = useState(product.isActive);
  const [imageUrl, setImageUrl] = useState(product.imageUrl);
  const [draft, setDraft] = useState({
    name: product.name,
    description: product.description || "",
    category: product.category,
    price: product.price.toFixed(2),
  });
  const [imageUpload, setImageUpload] = useState<PreparedImageUpload | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (imageUpload?.previewUrl) {
        URL.revokeObjectURL(imageUpload.previewUrl);
      }
    };
  }, [imageUpload]);

  function runAction(
    key: string,
    action: () => Promise<void | { message?: string; deleted?: boolean; imageUrl?: string }>,
    successMessage: string | (() => string),
    onSuccess?: () => void
  ) {
    setPendingKey(key);

    startTransition(async () => {
      try {
        const actionResult = await action();

        if (actionResult?.deleted === false) {
          setIsActive(false);
          setImageUrl(null);
        }

        if (actionResult?.imageUrl) {
          setImageUrl(actionResult.imageUrl);
          setImageUpload((current) => {
            if (current?.previewUrl) {
              URL.revokeObjectURL(current.previewUrl);
            }

            return null;
          });
        }

        setFeedback({
          message:
            actionResult?.message ||
            (typeof successMessage === "function" ? successMessage() : successMessage),
          tone: "success",
        });
        onSuccess?.();
        router.refresh();
      } catch (error) {
        setFeedback({
          message:
            error instanceof Error ? error.message : "Não foi possível atualizar o produto.",
          tone: "error",
        });
      } finally {
        setPendingKey(null);
      }
    });
  }

  const categoryLabel = getProductCategoryLabel(draft.category);
  const visibleImage = imageUpload?.previewUrl || imageUrl;

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
          if (isOpen) {
            setIsEditing(false);
          }
        }}
        className="grid w-full grid-cols-[5.5rem_1fr] items-center gap-3.5 px-4 py-4 text-left transition hover:bg-white/[0.035] sm:grid-cols-[6rem_1fr_auto]"
      >
        <ProductImage imageUrl={visibleImage} name={draft.name} compact />

        <div className="min-w-0">
          <p className="line-clamp-2 text-base font-semibold leading-5 text-white">
            {draft.name}
          </p>
          <p className="mt-1 truncate text-sm leading-5 text-zinc-400">
            {categoryLabel}
          </p>
          <p className="mt-0.5 whitespace-nowrap text-sm font-semibold leading-5 text-zinc-300">
            R$ {Number(draft.price || 0).toFixed(2)}
          </p>
        </div>

        <div className="col-span-2 flex shrink-0 items-center justify-between gap-2 border-t border-white/10 pt-3 sm:col-span-1 sm:border-0 sm:pt-0">
          <StatusBadge variant={isActive ? "success" : "neutral"}>
            {isActive ? "Ativo" : "Oculto"}
          </StatusBadge>
          <span className="text-lg text-zinc-500">{isOpen ? "-" : "+"}</span>
        </div>
      </button>

      {isOpen ? (
        <div className="border-t border-white/10 px-3.5 pb-3.5 pt-3.5">
          <FeedbackMessage message={feedback.message} tone={feedback.tone} />

          {isEditing ? (
            <div className="mt-3 space-y-3">
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData();
                  formData.set("productId", product.id);
                  formData.set("name", sanitizeTextInput(draft.name, { maxLength: 120 }));
                  formData.set("description", sanitizeTextareaInput(draft.description, 500));
                  formData.set("category", draft.category);
                  formData.set("price", draft.price);
                  formData.set("stock", String(product.stock));
                  if (imageUpload) {
                    formData.set("image", imageUpload.file);
                  }

                  runAction(
                    "details",
                    () => updateProductFromForm(formData),
                    "Produto atualizado com sucesso.",
                    () => setIsEditing(false)
                  );
                }}
              >
                <div className="grid gap-2 sm:grid-cols-[1fr_13rem]">
                  <Field label="Nome">
                    <input
                      value={draft.name}
                      maxLength={120}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, name: event.target.value }))
                      }
                      className="service-edit-control"
                    />
                  </Field>

                  <Field label="Categoria">
                    <select
                      value={draft.category}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      className="service-edit-control"
                    >
                      {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Descrição">
                  <textarea
                    value={draft.description}
                    maxLength={500}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={2}
                    className="service-edit-control min-h-20"
                  />
                </Field>

                <div className="grid gap-2">
                  <Field label="Preço">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.price}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, price: event.target.value }))
                      }
                      className="service-edit-control"
                    />
                  </Field>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="grid grid-cols-[4rem_1fr] gap-3 sm:grid-cols-[4.5rem_1fr] sm:items-center">
                    <ProductImage imageUrl={visibleImage} name={draft.name} />

                    <div className="min-w-0">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                        Imagem principal de capa
                      </p>
                      <input
                        id={`product-image-${product.id}`}
                        name="image"
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
                            setFeedback({ message: null, tone: "success" });
                          } catch (error) {
                            event.currentTarget.value = "";
                            setImageUpload(null);
                            setFeedback({
                              message:
                                error instanceof Error
                                  ? error.message
                                  : "Nao foi possivel preparar a imagem.",
                              tone: "error",
                            });
                          }
                        }}
                        className="sr-only"
                      />
                      <div className="grid gap-2">
                        <label
                          htmlFor={`product-image-${product.id}`}
                          className="btn-primary min-h-10 w-full cursor-pointer rounded-xl shadow-none"
                        >
                          Escolher imagem
                        </label>
                        <p className="truncate text-xs text-zinc-500">
                          {imageUpload?.file.name || "Nenhuma nova imagem selecionada"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          A imagem sera salva junto com os dados do produto.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="service-action-stack">
                  <div className="service-action-row service-action-row-primary">
                    <button
                      type="submit"
                      disabled={isPending && pendingKey === "details"}
                      className="btn-primary"
                    >
                      {isPending && pendingKey === "details" ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </form>

              <div className="service-action-row service-action-row-danger">
                <button
                  type="button"
                  disabled={isPending && pendingKey === "toggle"}
                  onClick={() =>
                    runAction(
                      "toggle",
                      async () => {
                        const updatedProduct = await toggleProduct(product.id);
                        setIsActive(updatedProduct.isActive);
                      },
                      () => (isActive ? "Produto ocultado." : "Produto ativado.")
                    )
                  }
                  className={isActive ? "btn-warning-soft" : "btn-secondary"}
                >
                  {isPending && pendingKey === "toggle"
                    ? "Salvando..."
                    : isActive
                    ? "Ocultar"
                    : "Ativar"}
                </button>

                <button
                  type="button"
                  disabled={isPending && pendingKey === "delete"}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Excluir produto do catálogo? Esta ação remove o item definitivamente."
                      )
                    ) {
                      return;
                    }

                    runAction(
                      "delete",
                      () => deleteProduct(product.id),
                      "Produto excluído com sucesso."
                    );
                  }}
                  className="btn-danger"
                >
                  {isPending && pendingKey === "delete" ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <SummaryTile label="Preço" value={`R$ ${Number(draft.price || 0).toFixed(2)}`} />
                <SummaryTile label="Categoria" value={categoryLabel} />
              </div>

              {draft.description ? (
                <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-400">
                  {draft.description}
                </p>
              ) : null}

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary"
                >
                  Editar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

function ProductImage({
  imageUrl,
  name,
  compact = false,
}: {
  imageUrl: string | null;
  name: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl bg-black/20 ${
        compact ? "h-20 w-20 sm:h-24 sm:w-24" : "h-16 w-16"
      }`}
    >
      {imageUrl ? (
        imageUrl.startsWith("blob:") ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes={compact ? "(max-width: 640px) 80px, 96px" : "64px"}
            className="object-cover"
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
          Sem imagem
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-2.5">
      <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-bold ${
          accent ? "text-[var(--brand-strong)]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
