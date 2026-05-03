"use client";

import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { normalizeProductImageUrl } from "@/lib/productImageUrl";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
};

export function ProductGrid({
  products,
  whatsappNumber,
}: {
  products: Product[];
  whatsappNumber: string;
}) {
  const clampStyle = {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  };

  const getShortDescription = (description: string | null) => {
    const cleaned = (description ?? "Produto sem descrição.")
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned.length <= 42) {
      return cleaned;
    }

    return `${cleaned.slice(0, 39).trimEnd()}...`;
  };

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Catélogo disponível
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Escolha um item e chame no WhatsApp para combinar compra, retirada ou disponibilidade.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="group overflow-hidden rounded-[14px] border border-white/10 bg-[#111622] shadow-[0_16px_36px_rgba(0,0,0,0.24)] transition hover:border-sky-400/20"
          >
            <div className="relative aspect-square overflow-hidden border-b border-white/10 bg-[#edf1f7]">
              <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-2 sm:left-4 sm:top-4">
                {product.stock <= 3 ? (
                  <span className="rounded-full border border-amber-300/25 bg-amber-500/90 px-2 py-1 text-[9px] font-semibold text-white sm:px-3 sm:text-xs">
                    Consultar estoque
                  </span>
                ) : null}
              </div>
              {normalizeProductImageUrl(product.imageUrl) ? (
                <Image
                  src={normalizeProductImageUrl(product.imageUrl) || ""}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-contain transition duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500">
                  Sem imagem
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4">
              <div>
                <h3
                  className="min-h-[3.9rem] text-[15px] font-semibold leading-6 text-white sm:min-h-[4rem] sm:text-lg"
                  style={{ ...clampStyle, WebkitLineClamp: 2 }}
                >
                  {product.name}
                </h3>
                <p
                  className="mt-1.5 min-h-[2.9rem] text-[12px] leading-5 text-zinc-400 sm:min-h-[3.2rem] sm:text-sm"
                  style={{ ...clampStyle, WebkitLineClamp: 2 }}
                >
                  {getShortDescription(product.description)}
                </p>
              </div>

              <div className="mt-3 sm:mt-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
                  Preco
                </p>
                <p className="mt-1 text-[18px] font-bold text-white sm:text-2xl">
                  {formatCurrency(product.price)}
                </p>
              </div>

              <div className="mt-3 sm:mt-4">
                {whatsappNumber ? (
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                      `Ola! Tenho interesse no produto ${product.name} do Arsenal do barbeiro.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-[var(--brand)] px-3 py-3 text-center text-[12px] font-semibold leading-5 text-white transition hover:brightness-110 sm:px-4 sm:text-sm"
                  >
                    Entrar em contato com o vendedor
                  </a>
                ) : (
                  <span className="block rounded-lg border border-white/10 px-4 py-3 text-center text-sm text-zinc-400">
                    Consulte disponibilidade na barbearia
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
