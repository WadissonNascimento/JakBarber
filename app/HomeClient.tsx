"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CrownRating from "@/components/ui/CrownRating";

export type HomeReview = {
  id: string;
  rating: number;
  comment: string;
  customerName: string;
};

const corteImages = [
  "/cortes/corte1.webp",
  "/cortes/corte2.webp",
  "/cortes/corte3.webp",
];

function formatReviewName(name: string) {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  const initial = rest[0]?.slice(0, 1);

  return initial ? `${firstName} ${initial}.` : firstName || "Cliente";
}

export default function HomeClient({
  reviews,
  hasMoreReviews,
}: {
  reviews: HomeReview[];
  hasMoreReviews: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [isTouching, setIsTouching] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  function nextSlide() {
    setCurrent((prev) => (prev + 1) % corteImages.length);
  }

  function prevSlide() {
    setCurrent((prev) => (prev - 1 + corteImages.length) % corteImages.length);
  }

  useEffect(() => {
    if (isTouching) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % corteImages.length);
    }, 4500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTouching]);

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    setIsTouching(true);
    setTouchEndX(null);
    setTouchStartX(event.targetTouches[0].clientX);
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    setTouchEndX(event.targetTouches[0].clientX);
  }

  function handleTouchEnd() {
    if (touchStartX === null || touchEndX === null) {
      setIsTouching(false);
      return;
    }

    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }

    setTouchStartX(null);
    setTouchEndX(null);
    setIsTouching(false);
  }

  return (
    <main className="relative min-h-screen text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.12),_transparent_30%)]" />

      <section className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 sm:pt-10">
        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="order-2 lg:order-1">
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Seu estilo começa aqui.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">
              Agende seu horário com praticidade e tenha uma experiência premium
              na JakCompany.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/agendar"
                className="rounded-lg bg-[var(--brand)] px-6 py-3 text-center font-semibold text-white shadow-[0_12px_30px_rgba(14,165,233,0.35)] transition hover:brightness-110 active:scale-[0.98]"
              >
                Agendar horário
              </Link>

              <Link
                href="/produtos"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-6 py-3 text-center text-white transition hover:bg-white/[0.08] active:scale-[0.98]"
              >
                Arsenal do barbeiro
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="surface-card rounded-lg p-4">
                <p className="text-xs text-[var(--brand-strong)]">Local</p>
                <p className="mt-2 text-sm text-zinc-200">Osasco, SP</p>
              </div>

              <div className="surface-card rounded-lg p-4">
                <p className="text-xs text-[var(--brand-strong)]">Horário</p>
                <p className="mt-2 text-sm text-zinc-200">Terça a domingo</p>
              </div>

              <div className="surface-card rounded-lg p-4">
                <p className="text-xs text-[var(--brand-strong)]">Atendimento</p>
                <p className="mt-2 text-sm text-zinc-200">Com hora marcada</p>
              </div>
            </div>
          </div>

          <div className="order-1 mx-auto w-full max-w-[560px] lg:order-2 lg:max-w-none">
            <div className="relative">
              <div className="surface-card-strong relative overflow-hidden rounded-2xl p-2">
                <div
                  className="relative select-none overflow-hidden rounded-[20px]"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="relative h-[290px] w-full sm:h-[360px] md:h-[420px] lg:h-[560px] xl:h-[620px]">
                    <Image
                      key={corteImages[current]}
                      src={corteImages[current]}
                      alt={`Corte ${current + 1}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 560px"
                      priority={current === 0}
                      className="object-cover transition-all duration-700 ease-out"
                    />
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />

                  <button
                    type="button"
                    onClick={prevSlide}
                    className="absolute left-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-white/10 bg-black/35 text-lg text-white backdrop-blur-xl transition hover:bg-[var(--brand-muted)] sm:left-4 sm:flex sm:h-12 sm:w-12 sm:text-xl"
                    aria-label="Foto anterior"
                  >
                    {"<"}
                  </button>

                  <button
                    type="button"
                    onClick={nextSlide}
                    className="absolute right-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-white/10 bg-black/35 text-lg text-white backdrop-blur-xl transition hover:bg-[var(--brand-muted)] sm:right-4 sm:flex sm:h-12 sm:w-12 sm:text-xl"
                    aria-label="Próxima foto"
                  >
                    {">"}
                  </button>

                  <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                    {corteImages.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrent(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          current === index
                            ? "w-6 bg-[var(--brand)]"
                            : "w-2 bg-white/50"
                        }`}
                        aria-label={`Ver corte ${index + 1}`}
                      />
                    ))}
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-strong)]">
              Avaliações
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              O que os clientes acharam.
            </h2>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.04] p-5 text-sm text-zinc-400">
            As avaliações reais dos clientes vão aparecer aqui depois dos
            atendimentos concluídos.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              >
                <CrownRating rating={review.rating} size="sm" />
                <p className="mt-4 text-sm leading-6 text-zinc-300">
                  {review.comment}
                </p>
                <p className="mt-5 text-sm font-semibold text-white">
                  {formatReviewName(review.customerName)}
                </p>
              </article>
            ))}
          </div>
        )}

        {hasMoreReviews ? (
          <div className="mt-5 flex justify-center">
            <Link
              href="/avaliacoes"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Ver mais avaliações
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
