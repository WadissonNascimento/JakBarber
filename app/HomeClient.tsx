"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  AtSign,
  MapPin,
  MessageCircle,
  Scissors,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import CrownRating from "@/components/ui/CrownRating";
import type { PublicHomeContent } from "@/lib/shopHomeContent";

export type HomeReview = {
  id: string;
  rating: number;
  comment: string;
  customerName: string;
};

export type HomeService = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  duration: number;
};

export type HomeBarber = {
  id: string;
  name: string;
  image?: string | null;
};

export type HomeProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
};

type HomeClientProps = {
  reviews: HomeReview[];
  hasMoreReviews: boolean;
  homeImages?: string[];
  shopId?: string;
  brandName: string;
  addressLine: string;
  businessHours: string;
  logoPath?: string;
  whatsappNumber?: string;
  instagramUrl?: string;
  services?: HomeService[];
  barbers?: HomeBarber[];
  products?: HomeProduct[];
  homeContent: PublicHomeContent;
};

const corteImages = [
  "/cortes/corte1.webp",
  "/cortes/corte2.webp",
  "/cortes/corte3.webp",
];

const rodrigoHeroFallback = "/brands/rodrigo-style/hero-premium.webp";

function formatReviewName(name: string) {
  const [firstName] = name.trim().split(/\s+/);

  return firstName || "Cliente";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function buildWhatsAppHref(phone: string | undefined, brandName: string) {
  const digits = (phone || "").replace(/\D/g, "");

  if (!digits) {
    return "/agendar";
  }

  const message = `Olá, ${brandName}! Quero agendar um horário.`;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default function HomeClient(props: HomeClientProps) {
  if (props.shopId === "shop_rodrigo_style") {
    return <RodrigoStyleHome {...props} />;
  }

  if (props.shopId && props.shopId !== "shop_jak_barber") {
    return <EditableTenantHome {...props} />;
  }

  return <DefaultHomeClient {...props} />;
}

function EditableTenantHome({
  reviews,
  hasMoreReviews,
  homeImages = [],
  brandName,
  addressLine,
  businessHours,
  whatsappNumber,
  instagramUrl,
  services = [],
  barbers = [],
  products = [],
  homeContent,
}: HomeClientProps) {
  const heroImage = homeImages[0] || corteImages[0] || "/cortes/corte1.webp";
  const whatsappHref = buildWhatsAppHref(whatsappNumber, brandName);
  const infoCards = [
    {
      label: homeContent.infoOneLabel,
      value: homeContent.infoOneValue || addressLine,
    },
    {
      label: homeContent.infoTwoLabel,
      value: homeContent.infoTwoValue || businessHours,
    },
    {
      label: homeContent.infoThreeLabel,
      value: homeContent.infoThreeValue,
    },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden text-white">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pt-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--brand-strong)]">
            {homeContent.heroEyebrow}
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight sm:text-6xl">
            {homeContent.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">
            {homeContent.heroSubtitle}
          </p>
          <div className="mt-7 grid gap-3 sm:max-w-lg sm:grid-cols-2">
            <Link
              href={homeContent.primaryButtonHref}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--brand)] px-5 py-3 text-center text-sm font-black text-white transition hover:brightness-110 active:scale-[0.98]"
            >
              {homeContent.primaryButtonLabel}
            </Link>
            <Link
              href={homeContent.secondaryButtonHref}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/[0.08] active:scale-[0.98]"
            >
              {homeContent.secondaryButtonLabel}
            </Link>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {infoCards.map((card) => (
              <div key={card.label} className="surface-card rounded-lg p-4">
                <p className="text-xs text-[var(--brand-strong)]">{card.label}</p>
                <p className="mt-2 text-sm text-zinc-200">{card.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-2">
          <div className="relative h-[300px] overflow-hidden rounded-xl sm:h-[440px] lg:h-[600px]">
            <Image
              src={heroImage}
              alt={brandName}
              fill
              sizes="(max-width: 1024px) 100vw, 560px"
              priority
              quality={92}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
          </div>
        </div>
      </section>

      {homeContent.showServices ? (
        <EditableSection
          eyebrow={homeContent.servicesEyebrow}
          title={homeContent.servicesTitle}
          description={homeContent.servicesDescription}
        >
          {services.length === 0 ? (
            <EditableEmpty text="Os servicos desta barbearia aparecerao aqui em breve." />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {services.map((service) => (
                <article
                  key={service.id}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
                >
                  <Scissors className="h-5 w-5 text-[var(--brand-strong)]" />
                  <h3 className="mt-4 text-lg font-black text-white">{service.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    {service.description || `${service.duration} min de atendimento.`}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <strong className="text-[var(--brand-strong)]">
                      {formatCurrency(service.price)}
                    </strong>
                    <Link
                      href="/agendar"
                      className="rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-black text-white"
                    >
                      Agendar
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </EditableSection>
      ) : null}

      {homeContent.showBarbers ? (
        <EditableSection
          eyebrow={homeContent.barbersEyebrow}
          title={homeContent.barbersTitle}
          description={homeContent.barbersDescription}
        >
          {barbers.length === 0 ? (
            <EditableEmpty text="A equipe desta barbearia aparecera aqui em breve." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {barbers.map((barber) => (
                <article
                  key={barber.id}
                  className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
                    {barber.image ? (
                      <Image
                        src={barber.image}
                        alt={barber.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <Users className="h-7 w-7 text-[var(--brand-strong)]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-white">{barber.name}</h3>
                    <p className="mt-1 text-sm text-zinc-400">Atendimento por agenda</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </EditableSection>
      ) : null}

      {homeContent.showProducts ? (
        <EditableSection
          eyebrow={homeContent.productsEyebrow}
          title={homeContent.productsTitle}
          description={homeContent.productsDescription}
        >
          {products.length === 0 ? (
            <EditableEmpty text="Os produtos desta barbearia aparecerao aqui em breve." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="relative mb-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-white/10">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 240px"
                        className="object-cover"
                      />
                    ) : (
                      <ShoppingBag className="h-8 w-8 text-[var(--brand-strong)]" />
                    )}
                  </div>
                  <h3 className="font-black text-white">{product.name}</h3>
                  <p className="mt-2 font-black text-[var(--brand-strong)]">
                    {formatCurrency(product.price)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </EditableSection>
      ) : null}

      {homeContent.showAbout ? (
        <EditableSection
          eyebrow={homeContent.aboutEyebrow}
          title={homeContent.aboutTitle}
          description={homeContent.aboutBody}
        />
      ) : null}

      {homeContent.showReviews ? (
        <EditableSection
          eyebrow={homeContent.reviewsEyebrow}
          title={homeContent.reviewsTitle}
          description=""
        >
          {reviews.length === 0 ? (
            <EditableEmpty text={homeContent.reviewsEmptyText} />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
                >
                  <p className="text-sm font-semibold text-white">
                    {formatReviewName(review.customerName)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <CrownRating rating={review.rating} size="sm" />
                    <span className="text-xs font-semibold text-zinc-400">
                      Nota {review.rating}/5
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-zinc-300">
                    {review.comment}
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
                Ver mais avaliacoes
              </Link>
            </div>
          ) : null}
        </EditableSection>
      ) : null}

      {homeContent.showContact ? (
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-strong)]">
                {homeContent.contactEyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-black text-white">
                {homeContent.contactTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                {homeContent.contactBody}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
              <a
                href={whatsappHref}
                target={whatsappNumber ? "_blank" : undefined}
                rel={whatsappNumber ? "noreferrer" : undefined}
                className="rounded-lg bg-[#25d366] px-5 py-3 text-center text-sm font-black text-black"
              >
                WhatsApp
              </a>
              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/10 px-5 py-3 text-center text-sm font-black text-white"
                >
                  Instagram
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-center text-xs text-zinc-500 sm:px-6">
        {homeContent.footerText}
      </footer>
    </main>
  );
}

function EditableSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-strong)]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EditableEmpty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.04] p-5 text-sm text-zinc-400">
      {text}
    </div>
  );
}

function DefaultHomeClient({
  reviews,
  hasMoreReviews,
  homeImages = [],
  brandName,
  addressLine,
  businessHours,
}: HomeClientProps) {
  const galleryImages = homeImages.length > 0 ? homeImages.slice(0, 5) : corteImages;
  const [current, setCurrent] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [isTouching, setIsTouching] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  function nextSlide() {
    setCurrent((prev) => (prev + 1) % galleryImages.length);
  }

  function prevSlide() {
    setCurrent((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  }

  useEffect(() => {
    if (current >= galleryImages.length) {
      setCurrent(0);
    }
  }, [current, galleryImages.length]);

  useEffect(() => {
    if (isTouching) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % galleryImages.length);
    }, 4500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [galleryImages.length, isTouching]);

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

  const defaultHeroImage = corteImages[0] || "/cortes/corte1.webp";
  const activeImage = galleryImages[current] || defaultHeroImage;
  const fallbackImage = corteImages[current % corteImages.length] || defaultHeroImage;
  const visibleImage = failedImages[activeImage] ? fallbackImage : activeImage;

  return (
    <main className="relative min-h-screen text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.12),_transparent_30%)]" />

      <section className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 sm:pt-10">
        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Seu estilo começa aqui.
            </h1>
          </div>

          <div className="order-3 min-w-0 lg:col-start-1 lg:row-start-2">
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">
              Agende seu horário com praticidade e tenha uma experiência premium
              na {brandName}.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/agendar"
                className="rounded-lg bg-[var(--brand)] px-6 py-3 text-center font-semibold text-white shadow-[0_12px_30px_rgba(14,165,233,0.35)] transition hover:brightness-110 active:scale-[0.98]"
              >
                Agendar horário
              </Link>

              <Link
                href="/maquinas"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-6 py-3 text-center text-white transition hover:bg-white/[0.08] active:scale-[0.98]"
              >
                Maquinas
              </Link>
            </div>

            <div className="mt-8 hidden gap-3 sm:grid-cols-3 lg:grid">
              <div className="surface-card rounded-lg p-4">
                <p className="text-xs text-[var(--brand-strong)]">Local</p>
                <p className="mt-2 text-sm text-zinc-200">{addressLine}</p>
              </div>

              <div className="surface-card rounded-lg p-4">
                <p className="text-xs text-[var(--brand-strong)]">Horário</p>
                <p className="mt-2 text-sm text-zinc-200">{businessHours}</p>
              </div>

              <div className="surface-card rounded-lg p-4">
                <p className="text-xs text-[var(--brand-strong)]">Atendimento</p>
                <p className="mt-2 text-sm text-zinc-200">Com hora marcada</p>
              </div>
            </div>
          </div>

          <div className="order-2 mx-auto w-full max-w-[560px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-w-none">
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
                      key={visibleImage}
                      src={visibleImage}
                      alt={`Corte ${current + 1}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 560px"
                      quality={92}
                      priority={current === 0}
                      className="object-cover transition-all duration-700 ease-out"
                      onError={() => {
                        setFailedImages((currentFailures) => ({
                          ...currentFailures,
                          [activeImage]: true,
                        }));
                      }}
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
                    {galleryImages.map((_, index) => (
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

          <div className="order-4 grid gap-3 sm:grid-cols-3 lg:hidden">
            <div className="surface-card rounded-lg p-4">
              <p className="text-xs text-[var(--brand-strong)]">Local</p>
              <p className="mt-2 text-sm text-zinc-200">{addressLine}</p>
            </div>

            <div className="surface-card rounded-lg p-4">
              <p className="text-xs text-[var(--brand-strong)]">Horário</p>
              <p className="mt-2 text-sm text-zinc-200">{businessHours}</p>
            </div>

            <div className="surface-card rounded-lg p-4">
              <p className="text-xs text-[var(--brand-strong)]">Atendimento</p>
              <p className="mt-2 text-sm text-zinc-200">Com hora marcada</p>
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
                <p className="text-sm font-semibold text-white">
                  {formatReviewName(review.customerName)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <CrownRating rating={review.rating} size="sm" />
                  <span className="text-xs font-semibold text-zinc-400">
                    Nota {review.rating}/5
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-300">
                  {review.comment}
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

function RodrigoStyleHome({
  reviews,
  hasMoreReviews,
  homeImages = [],
  brandName,
  addressLine,
  businessHours,
  whatsappNumber,
  instagramUrl,
  services = [],
  barbers = [],
  products = [],
}: HomeClientProps) {
  const heroImage = homeImages[0] || rodrigoHeroFallback;
  const whatsappHref = buildWhatsAppHref(whatsappNumber, brandName);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f8f5ef] text-[#111111]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(212,175,55,0.16),_transparent_34%),linear-gradient(180deg,_#fafaf7_0%,_#f8f5ef_55%,_#efe7d8_100%)]" />

      <section className="relative px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="order-1 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/35 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6416] shadow-[0_10px_24px_rgba(26,18,8,0.06)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Barbearia premium
            </div>

            <h1 className="mt-5 max-w-xl break-words text-[1.82rem] font-black leading-[1.04] tracking-normal text-[#0b0b0b] min-[390px]:text-[2.2rem] sm:text-6xl lg:text-7xl">
              <span className="block">Barbearia</span>
              <span className="block">Rodrigo Style</span>
            </h1>

            <p className="mt-4 max-w-[17.5rem] text-base leading-7 text-[#5f5f5f] min-[390px]:max-w-lg sm:text-lg">
              <span className="block">Estilo que representa.</span>
              <span className="block">Confianca que impressiona.</span>
            </p>

            <div className="mt-6 grid gap-3 sm:max-w-lg sm:grid-cols-2">
              <Link
                href="/agendar"
                className="inline-flex min-h-14 items-center justify-center rounded-xl bg-[#0b0b0b] px-5 py-3 text-center text-base font-black text-[#f8f5ef] shadow-[0_18px_40px_rgba(11,11,11,0.18)] transition hover:bg-[#c9972b] hover:text-[#0b0b0b] active:scale-[0.98]"
              >
                Agendar horario
              </Link>

              <Link
                href="/servicos"
                className="inline-flex min-h-14 items-center justify-center rounded-xl border border-[#d4af37]/45 bg-white px-5 py-3 text-center text-base font-bold text-[#0b0b0b] shadow-[0_12px_28px_rgba(26,18,8,0.06)] transition hover:border-[#c9972b] hover:bg-[#fff8e8] active:scale-[0.98]"
              >
                Nossos servicos
              </Link>
            </div>

            <div className="mt-5 grid gap-2 text-xs font-semibold text-[#5f5f5f] sm:flex sm:flex-wrap">
              <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[#e6dfd2] bg-white px-3 py-2">
                <Clock3 className="h-4 w-4 text-[#c9972b]" aria-hidden="true" />
                <span className="min-w-0 truncate">{businessHours}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[#e6dfd2] bg-white px-3 py-2">
                <MapPin className="h-4 w-4 text-[#c9972b]" aria-hidden="true" />
                <span className="min-w-0 truncate">{addressLine}</span>
              </span>
            </div>
          </div>

          <div className="order-2 lg:order-2">
            <div className="relative overflow-hidden rounded-3xl border border-[#e6dfd2] bg-white shadow-[0_24px_70px_rgba(26,18,8,0.12)]">
              <div className="relative h-[260px] sm:h-[390px] lg:h-[620px]">
                <Image
                  src={heroImage}
                  alt="Ambiente premium da Rodrigo Style"
                  fill
                  sizes="(max-width: 1024px) 100vw, 580px"
                  quality={92}
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/10" />
              </div>
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-[#e6dfd2] bg-white/90 p-4 shadow-[0_12px_32px_rgba(26,18,8,0.10)] backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8a6416]">
                  Atendimento com hora marcada
                </p>
                <p className="mt-1 text-sm leading-6 text-[#5f5f5f]">
                  Escolha seu barbeiro, selecione o servico e confirme pelo celular.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Servicos"
            title="Cortes, barba e acabamento com presenca."
            description="Escolha o atendimento e avance direto para o agendamento."
          />

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {services.length > 0 ? (
              services.map((service) => (
                <article
                  key={service.id}
                  className="rounded-2xl border border-[#e6dfd2] bg-white p-4 shadow-[0_16px_36px_rgba(26,18,8,0.08)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d4af37]/15 text-[#8a6416]">
                      <Scissors className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-[#111111]">{service.name}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#5f5f5f]">
                        {service.description || `${service.duration} min de atendimento.`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#e6dfd2] pt-4">
                    <span className="text-xl font-black text-[#8a6416]">
                      {formatCurrency(service.price)}
                    </span>
                    <Link
                      href="/agendar"
                      className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[#0b0b0b] px-4 text-sm font-black text-[#f8f5ef] transition hover:bg-[#c9972b] hover:text-[#0b0b0b] active:scale-[0.98]"
                    >
                      Agendar
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <EmptyRodrigoCard text="Os servicos desta unidade aparecerao aqui em breve." />
            )}
          </div>
        </div>
      </section>

      <section id="barbeiros" className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Barbeiros"
            title="Equipe preparada para o seu estilo."
            description="Selecione o profissional no fluxo de agendamento."
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {barbers.length > 0 ? (
              barbers.map((barber) => (
                <article
                  key={barber.id}
                  className="flex items-center gap-4 rounded-2xl border border-[#e6dfd2] bg-white p-4 shadow-[0_14px_32px_rgba(26,18,8,0.07)]"
                >
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#d4af37]/35 bg-[#d4af37]/12">
                    {barber.image ? (
                      <Image
                        src={barber.image}
                        alt={barber.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <Users className="h-7 w-7 text-[#8a6416]" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black text-[#111111]">{barber.name}</h3>
                    <p className="mt-1 text-sm text-[#5f5f5f]">Segunda a sabado</p>
                  </div>
                  <Star className="h-5 w-5 shrink-0 fill-[#c9972b] text-[#c9972b]" aria-hidden="true" />
                </article>
              ))
            ) : (
              <EmptyRodrigoCard text="A equipe desta unidade aparecera aqui em breve." />
            )}
          </div>
        </div>
      </section>

      <section id="agenda" className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[#d4af37]/35 bg-[#fff8e8] p-5 shadow-[0_18px_42px_rgba(26,18,8,0.08)] sm:p-7">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8a6416]">
                Agenda
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#111111] sm:text-3xl">
                Garanta seu horario sem demora.
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#5f5f5f]">
                O botao principal leva direto para o fluxo de agendamento da unidade Rodrigo Style.
              </p>
            </div>
            <Link
              href="/agendar"
              className="inline-flex min-h-14 items-center justify-center rounded-xl bg-[#0b0b0b] px-6 text-base font-black text-[#f8f5ef] shadow-[0_18px_40px_rgba(11,11,11,0.16)] transition hover:bg-[#c9972b] hover:text-[#0b0b0b] active:scale-[0.98]"
            >
              Agendar horario
            </Link>
          </div>
        </div>
      </section>

      {products.length > 0 ? (
        <section id="maquinas" className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <SectionTitle
              eyebrow="Catalogo"
              title="Maquinas para manter o acabamento."
              description="Itens disponiveis no catalogo desta unidade."
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-2xl border border-[#e6dfd2] bg-white p-4 shadow-[0_14px_32px_rgba(26,18,8,0.07)]"
                >
                  <div className="relative mb-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-[#f8f5ef]">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 240px"
                        quality={90}
                        className="object-cover"
                      />
                    ) : (
                      <ShoppingBag className="h-8 w-8 text-[#8a6416]" aria-hidden="true" />
                    )}
                  </div>
                  <h3 className="text-base font-black text-[#111111]">{product.name}</h3>
                  <p className="mt-2 text-lg font-black text-[#8a6416]">
                    {formatCurrency(product.price)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="sobre" className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-[#e6dfd2] bg-white p-5 shadow-[0_16px_36px_rgba(26,18,8,0.08)] sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8a6416]">
              Sobre
            </p>
            <h2 className="mt-3 text-2xl font-black text-[#111111]">
              Um visual forte, limpo e bem acabado.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#5f5f5f]">
              A Rodrigo Style combina atendimento direto, estetica premium e cuidado com cada detalhe do corte.
            </p>
          </article>

          <article id="contato" className="rounded-3xl border border-[#d4af37]/35 bg-white p-5 shadow-[0_16px_36px_rgba(26,18,8,0.08)] sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8a6416]">
              Contato
            </p>
            <div className="mt-4 grid gap-3">
              <a
                href={whatsappHref}
                target={whatsappNumber ? "_blank" : undefined}
                rel={whatsappNumber ? "noreferrer" : undefined}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-5 text-base font-black text-black transition hover:brightness-110 active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Chamar no WhatsApp
              </a>
              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d4af37]/45 bg-[#fff8e8] px-5 text-sm font-bold text-[#0b0b0b] transition hover:bg-[#f8e4a6] active:scale-[0.98]"
                >
                  <AtSign className="h-5 w-5 text-[#8a6416]" aria-hidden="true" />
                  @rodrigostylebarbearia
                </a>
              ) : null}
            </div>
          </article>
        </div>
      </section>

      <section className="px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Avaliacoes"
            title="Confianca construida no atendimento."
            description="Os comentarios reais aparecem depois dos atendimentos concluidos."
          />

          {reviews.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#d4af37]/35 bg-white p-5 text-sm text-[#5f5f5f]">
              As avaliacoes da Rodrigo Style aparecerao aqui em breve.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-[#e6dfd2] bg-white p-4 shadow-[0_14px_32px_rgba(26,18,8,0.07)]"
                >
                  <p className="text-sm font-black text-[#111111]">
                    {formatReviewName(review.customerName)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <CrownRating rating={review.rating} size="sm" />
                    <span className="text-xs font-semibold text-[#5f5f5f]">
                      Nota {review.rating}/5
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#5f5f5f]">
                    {review.comment}
                  </p>
                </article>
              ))}
            </div>
          )}

          {hasMoreReviews ? (
            <div className="mt-5 flex justify-center">
              <Link
                href="/avaliacoes"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d4af37]/45 bg-white px-4 py-2 text-sm font-bold text-[#0b0b0b] transition hover:bg-[#fff8e8]"
              >
                Ver mais avaliacoes
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <div className="sticky bottom-0 z-40 border-t border-[#e6dfd2] bg-white/95 px-4 py-3 shadow-[0_-18px_40px_rgba(26,18,8,0.10)] backdrop-blur-xl sm:hidden">
        <Link
          href="/agendar"
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0b0b0b] px-5 text-base font-black text-[#f8f5ef]"
        >
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          Agendar horario
        </Link>
      </div>
    </main>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8a6416]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black leading-tight text-[#111111] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f5f5f]">
        {description}
      </p>
    </div>
  );
}

function EmptyRodrigoCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d4af37]/35 bg-white p-5 text-sm text-[#5f5f5f]">
      {text}
    </div>
  );
}
