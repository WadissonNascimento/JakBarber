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
import { prepareProductImageUpload } from "@/lib/productImageClient";
import {
  deleteProduct,
  toggleProduct,
  updateProductFromForm,
  updateProductImage,
} from "@/app/actions/productActions";

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
    stockMovements: Array<{
      id: string;
      createdAt: Date;
      type: string;
      quantity: number;
      reason: string | null;
    }>;
  };
};

function stockMovementTypeLabel(type: string) {
  switch (type) {
    case "IN":
      return "Entrada";
    case "OUT":
      return "Saida";
    default:
      return type;
  }
}

export default function ProductCardClient({
  product,
}: ProductCardClientProps) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(product.isActive);
  const [imageUrl, setImageUrl] = useState(product.imageUrl);
  const [draft, setDraft] = useState({
    name: product.name,
    description: product.description || "",
    category: product.category,
    price: product.price.toFixed(2),
    stock: String(product.stock),
  });
  const [imageUpload, setImageUpload] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
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
    successMessage: string | (() => string)
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
            (typeof successMessage === "function"
              ? successMessage()
              : successMessage),
          tone: "success",
        });
        router.refresh();
      } catch (error) {
        setFeedback({
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível atualizar o produto.",
          tone: "error",
        });
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <FeedbackMessage message={feedback.message} tone={feedback.tone} />
      </div>

      <div className="grid gap-4 md:grid-cols-[140px_1fr_auto]">
        <div className="relative h-28 overflow-hidden rounded-xl bg-zinc-950">
          {imageUpload?.previewUrl ? (
            <img
              src={imageUpload.previewUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              Sem imagem
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <StatusBadge variant={isActive ? "success" : "neutral"}>
              {isActive ? "Ativo" : "Oculto"}
            </StatusBadge>
            <StatusBadge variant="info">
              {getProductCategoryLabel(draft.category)}
            </StatusBadge>
            <StatusBadge
              variant={
                Number(draft.stock) === 0
                  ? "danger"
                  : Number(draft.stock) <= 3
                  ? "warning"
                  : "info"
              }
            >
              Estoque: {draft.stock}
            </StatusBadge>
          </div>

          <form
            className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-950/70 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData();
              formData.set("productId", product.id);
              formData.set("name", draft.name);
              formData.set("description", draft.description);
              formData.set("category", draft.category);
              formData.set("price", draft.price);
              formData.set("stock", draft.stock);

              runAction(
                "details",
                () => updateProductFromForm(formData),
                "Produto atualizado com sucesso."
              );
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Nome</span>
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
                />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Categoria</span>
                <select
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
                >
                  {PRODUCT_CATEGORY_OPTIONS.map((option) => (
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
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                rows={3}
                className="min-h-24 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Preco</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.price}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, price: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
                />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Estoque</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.stock}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, stock: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isPending && pendingKey === "details"}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && pendingKey === "details" ? "Salvando..." : "Salvar dados"}
            </button>
          </form>

          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              if (!imageUpload) {
                setFeedback({
                  message: "Selecione uma nova imagem para enviar.",
                  tone: "error",
                });
                return;
              }

              formData.set("image", imageUpload.file);

              runAction(
                "image",
                () => updateProductImage(formData),
                "Imagem atualizada com sucesso."
              );
            }}
          >
            <input type="hidden" name="productId" value={product.id} />
            <input
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
                        : "Não foi possível preparar a imagem.",
                    tone: "error",
                  });
                }
              }}
              className="max-w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-white"
            />
            <button
              type="submit"
              disabled={isPending && pendingKey === "image"}
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && pendingKey === "image"
                ? "Enviando..."
                : "Trocar imagem"}
            </button>
          </form>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-sm font-medium text-white">
              Ultimas movimentacoes
            </p>
            <div className="mt-2 space-y-1 text-sm text-zinc-400">
              {product.stockMovements.length === 0 ? (
                <p>Nenhuma movimentacao registrada ainda.</p>
              ) : (
                product.stockMovements.map((movement) => (
                  <p key={movement.id}>
                    {new Date(movement.createdAt).toLocaleDateString("pt-BR")} -{" "}
                    {stockMovementTypeLabel(movement.type)} {movement.quantity}
                    {movement.reason ? ` - ${movement.reason}` : ""}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
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
            className="rounded bg-yellow-600 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60"
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
                  "Excluir produto? Se houver histórico, ele será apenas ocultado para preservar pedidos."
                )
              ) {
                return;
              }

              runAction(
                "delete",
                () => deleteProduct(product.id),
                "Produto excluido com sucesso."
              );
            }}
            className="rounded bg-red-600 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending && pendingKey === "delete" ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}
