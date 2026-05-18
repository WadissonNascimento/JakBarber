"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { normalizeProductImageUrl } from "@/lib/productImageUrl";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  secondaryImages: {
    id: string;
    url: string;
  }[];
};

export function ProductGrid({
  products,
  whatsappNumber,
}: {
  products: Product[];
  whatsappNumber: string;
}) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [secondaryIndex, setSecondaryIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setSecondaryIndex(0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedProduct(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedProduct]);

  const whatsappHref = useMemo(() => {
    if (!selectedProduct) {
      return null;
    }

    const message =
      `Ola, tenho interesse na maquina ${selectedProduct.name}. ` +
      "Poderia me passar mais informacoes?" +
      (currentUrl ? `\n\nLink: ${currentUrl}` : "");

    return buildWhatsAppUrl(whatsappNumber, message);
  }, [currentUrl, selectedProduct, whatsappNumber]);

  return (
    <div className="space-y-8">
      <div className="dashboard-panel px-5 py-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Catalogo disponivel
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Toque em um item para ver fotos reais, detalhes e falar com o vendedor.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => setSelectedProduct(product)}
            className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] text-left shadow-[0_16px_36px_rgba(0,0,0,0.24)] transition hover:border-[var(--brand)]/35 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/70"
          >
            <div className="relative aspect-square overflow-hidden border-b border-white/10 bg-[#edf1f7]">
              {normalizeProductImageUrl(product.imageUrl) ? (
                <Image
                  src={normalizeProductImageUrl(product.imageUrl) || ""}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-contain transition duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500">
                  Sem imagem
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4">
              <h3 className="line-clamp-2 min-h-[3rem] text-[15px] font-semibold leading-6 text-white sm:text-lg">
                {product.name}
              </h3>

              {product.description ? (
                <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-xs leading-5 text-zinc-400 sm:text-sm">
                  {product.description}
                </p>
              ) : (
                <p className="mt-2 min-h-[3.75rem] text-xs leading-5 text-zinc-500 sm:text-sm">
                  Ver detalhes do produto
                </p>
              )}

              <span className="mt-3 inline-flex min-h-9 items-center rounded-full border border-white/10 px-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                Ver detalhes
              </span>
            </div>
          </button>
        ))}
      </div>

      {selectedProduct ? (
        <ProductDetailsModal
          product={selectedProduct}
          secondaryIndex={secondaryIndex}
          setSecondaryIndex={setSecondaryIndex}
          whatsappHref={whatsappHref}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}
    </div>
  );
}

function ProductDetailsModal({
  product,
  secondaryIndex,
  setSecondaryIndex,
  whatsappHref,
  onClose,
}: {
  product: Product;
  secondaryIndex: number;
  setSecondaryIndex: (index: number) => void;
  whatsappHref: string | null;
  onClose: () => void;
}) {
  const mainImageUrl = normalizeProductImageUrl(product.imageUrl);
  const secondaryImages = product.secondaryImages
    .map((image) => ({
      ...image,
      url: normalizeProductImageUrl(image.url) || image.url,
    }))
    .filter((image) => image.url);
  const currentSecondaryImage =
    secondaryImages[secondaryIndex] || secondaryImages[0] || null;

  function goToPreviousImage() {
    setSecondaryIndex(
      secondaryIndex === 0 ? secondaryImages.length - 1 : secondaryIndex - 1
    );
  }

  function goToNextImage() {
    setSecondaryIndex(
      secondaryIndex >= secondaryImages.length - 1 ? 0 : secondaryIndex + 1
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 px-3 py-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${product.name}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#080a0f] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/70 text-xl font-bold text-white"
          aria-label="Fechar detalhes do produto"
        >
          X
        </button>

        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
          <div className="border-b border-white/10 p-4 md:border-b-0 md:border-r md:p-5">
            <div className="relative aspect-square overflow-hidden rounded-[24px] bg-[#edf1f7]">
              {mainImageUrl ? (
                <Image
                  src={mainImageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 92vw, 45vw"
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  Sem imagem principal
                </div>
              )}
            </div>

            {secondaryImages.length > 0 && currentSecondaryImage ? (
              <div className="mt-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-white/10 bg-black/25">
                  <Image
                    src={currentSecondaryImage.url}
                    alt={`Foto secundaria de ${product.name}`}
                    fill
                    sizes="(max-width: 768px) 92vw, 45vw"
                    className="object-cover"
                  />

                  {secondaryImages.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={goToPreviousImage}
                        className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-lg font-bold text-white"
                        aria-label="Imagem anterior"
                      >
                        {"<"}
                      </button>
                      <button
                        type="button"
                        onClick={goToNextImage}
                        className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-lg font-bold text-white"
                        aria-label="Proxima imagem"
                      >
                        {">"}
                      </button>
                    </>
                  ) : null}
                </div>

                {secondaryImages.length > 1 ? (
                  <div className="mt-3 flex justify-center gap-2">
                    {secondaryImages.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setSecondaryIndex(index)}
                        className={`h-2.5 rounded-full transition ${
                          index === secondaryIndex
                            ? "w-7 bg-[var(--brand)]"
                            : "w-2.5 bg-white/30"
                        }`}
                        aria-label={`Ver foto ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
              Detalhes do produto
            </p>
            <h3 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
              {product.name}
            </h3>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-bold text-white">Descricao</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {product.description ||
                  "Entre em contato com a barbearia para receber mais detalhes sobre este produto."}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-bold text-white">Fotos reais</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {secondaryImages.length > 0
                  ? `${secondaryImages.length} foto(s) secundaria(s) disponivel(is).`
                  : "Este produto ainda nao tem fotos secundarias."}
              </p>
            </div>

            <div className="mt-5 grid gap-2">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary w-full px-4 py-3 text-center text-sm leading-6"
                >
                  Falar com o vendedor
                </a>
              ) : (
                <span className="block rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-zinc-400">
                  WhatsApp da barbearia nao configurado
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary w-full"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
