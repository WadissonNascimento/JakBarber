"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import { createProductFromForm } from "@/app/actions/productActions";
import { prepareProductImageUpload } from "@/lib/productImageClient";

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
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (imageUpload?.previewUrl) {
        URL.revokeObjectURL(imageUpload.previewUrl);
      }
    };
  }, [imageUpload]);

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
