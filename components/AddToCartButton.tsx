"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
};

export default function AddToCartButton({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addToCart({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      imageUrl: product.imageUrl || null,
    });

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleAdd}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 font-medium text-white shadow-[0_12px_30px_rgba(14,165,233,0.28)] transition hover:brightness-110 active:scale-[0.98]"
      >
        {added ? (
          <Check aria-hidden="true" className="h-4 w-4" />
        ) : (
          <ShoppingCart aria-hidden="true" className="h-4 w-4" />
        )}
        <span>{added ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}</span>
      </button>

      {added ? (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-center text-xs font-medium text-emerald-200">
          Item salvo. Vocé pode continuar comprando ou abrir o carrinho.
        </p>
      ) : null}
    </div>
  );
}
