"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import { createProductFromForm } from "@/app/actions/productActions";
import {
  prepareProductImageUpload,
  prepareSecondaryProductImageUpload,
} from "@/lib/productImageClient";

type PreparedImageUpload = {
  file: File;
  previewUrl: string;
};

export default function NewProductForm() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [imageUpload, setImageUpload] = useState<PreparedImageUpload | null>(null);
  const [secondaryUploads, setSecondaryUploads] = useState<PreparedImageUpload[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (imageUpload?.previewUrl) {
        URL.revokeObjectURL(imageUpload.previewUrl);
      }
    };
  }, [imageUpload]);

  useEffect(() => {
    return () => {
      secondaryUploads.forEach((upload) => URL.revokeObjectURL(upload.previewUrl));
    };
  }, [secondaryUploads]);

  return (
    <form
      className="mt-5 space-y-3.5 border-t border-white/10 pt-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);

        startTransition(async () => {
          try {
            if (imageUpload) {
              formData.set("image", imageUpload.file);
            }

            await createProductFromForm(formData);
            setFeedback({
              message: "Produto criado com sucesso. Abrindo a lista...",
              tone: "success",
            });
            router.push("/admin/produtos");
            router.refresh();
          } catch (error) {
            setFeedback({
              message:
                error instanceof Error
                  ? error.message
                  : "Não foi possível criar o produto.",
              tone: "error",
            });
          }
        });
      }}
    >
      <FeedbackMessage message={feedback.message} tone={feedback.tone} />

      <input type="hidden" name="category" value="SHELF" />
      <input type="hidden" name="stock" value="0" />

      <label className="block min-w-0">
        <span className="mb-1.5 block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
          Nome
        </span>
        <input
          name="name"
          placeholder="Ex.: Pomada modeladora"
          maxLength={120}
          className="service-edit-control"
          required
        />
      </label>

      <label className="block min-w-0">
        <span className="mb-1.5 block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
          Descrição
        </span>
        <textarea
          name="description"
          placeholder="Opcional"
          maxLength={500}
          rows={2}
          className="service-edit-control min-h-20"
        />
      </label>

      <div className="grid gap-3">
        <label className="block min-w-0">
          <span className="mb-1.5 block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
            Preço
          </span>
          <input
            name="price"
            placeholder="0.00"
            type="number"
            min="0"
            step="0.01"
            className="service-edit-control"
            required
          />
        </label>
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[1fr_7rem] sm:items-start">
        <label className="block min-w-0">
          <span className="mb-1.5 block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
            Imagem principal de capa
          </span>
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
            className="w-full text-sm text-zinc-300 file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--brand)] file:px-3 file:py-2 file:text-white"
          />
          <p className="mt-2 text-xs text-zinc-500">
            JPG, PNG ou WEBP. O sistema compacta automaticamente para até 2MB.
          </p>
        </label>

        {imageUpload ? (
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-[#edf1f7]">
            <div className="pointer-events-none absolute inset-[5%] rounded-[18px] border border-black/8" />
            <img
              src={imageUpload.previewUrl}
              loading="lazy"
              decoding="async"
              alt="Preview do produto"
              className="h-full w-full object-contain"
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="block min-w-0">
          <span className="mb-1.5 block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
            Imagens secundárias
          </span>
          <input
            id="new-product-secondary-images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={async (event) => {
              const files = Array.from(event.currentTarget.files || []);

              if (!files.length) {
                setSecondaryUploads((current) => {
                  current.forEach((upload) => URL.revokeObjectURL(upload.previewUrl));
                  return [];
                });
                return;
              }

              try {
                const preparedUploads = await Promise.all(
                  files.slice(0, 6).map((file) => prepareSecondaryProductImageUpload(file))
                );

                setSecondaryUploads((current) => {
                  const nextUploads = [...current, ...preparedUploads];
                  const visibleUploads = nextUploads.slice(0, 6);
                  nextUploads
                    .slice(6)
                    .forEach((upload) => URL.revokeObjectURL(upload.previewUrl));
                  return visibleUploads;
                });
                event.currentTarget.value = "";
                setFeedback({ message: null, tone: "success" });
              } catch (error) {
                event.currentTarget.value = "";
                setSecondaryUploads((current) => {
                  current.forEach((upload) => URL.revokeObjectURL(upload.previewUrl));
                  return [];
                });
                setFeedback({
                  message:
                    error instanceof Error
                      ? error.message
                      : "Não foi possível preparar as imagens secundárias.",
                  tone: "error",
                });
              }
            }}
            className="sr-only"
          />
          <div className="grid gap-2">
            <label
              htmlFor="new-product-secondary-images"
              className="btn-primary min-h-10 w-full cursor-pointer rounded-xl shadow-none"
            >
              Escolher imagens
            </label>
            <p className="truncate text-xs text-zinc-500">
              {secondaryUploads.length
                ? `${secondaryUploads.length} imagem(ns) selecionada(s)`
                : "Nenhuma imagem selecionada"}
            </p>
          </div>
        </div>

        {secondaryUploads.length ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {secondaryUploads.map((upload, index) => (
              <div
                key={`${upload.file.name}-${index}`}
                className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-[#edf1f7]"
              >
                <img
                  src={upload.previewUrl}
                  loading="lazy"
                  decoding="async"
                  alt={`Imagem secundária ${index + 1}`}
                  className="h-full w-full object-contain"
                />
                <button
                  type="button"
                  aria-label={`Remover imagem secundária ${index + 1}`}
                  onClick={() => {
                    setSecondaryUploads((current) => {
                      const target = current[index];
                      if (target) {
                        URL.revokeObjectURL(target.previewUrl);
                      }

                      return current.filter((_, currentIndex) => currentIndex !== index);
                    });
                  }}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/75 text-sm font-bold leading-none text-white shadow-lg"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <p className="mt-2 text-xs text-zinc-500">
          Seleção preparada para a próxima etapa de exibição do catálogo.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
