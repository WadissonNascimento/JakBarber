import Image from "next/image";

export const metadata = {
  title: "Sobre nos",
  description: "Conheça a trajetoria da Jak Barber e o cuidado por tras do atendimento.",
};

const timeline = [
  {
    label: "Comeco",
    text: "A Jak Barber nasceu com foco em corte bem feito, atendimento direto e respeito pelo horário do cliente.",
  },
  {
    label: "Crescimento",
    text: "A rotina ficou mais organizada com agenda marcada, equipe alinhada e serviços pensados para cada perfil.",
  },
  {
    label: "Hoje",
    text: "A barbearia une técnica, praticidade e acompanhamento para manter a experiência simples do início ao fim.",
  },
];

const photos = [
  {
    src: "/cortes/corte2.webp",
    alt: "Corte finalizado na Jak Barber",
  },
  {
    src: "/cortes/corte3.webp",
    alt: "Detalhe de atendimento da Jak Barber",
  },
];

export default function SobreNosPage() {
  return (
    <main className="page-shell max-w-5xl text-white">
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="surface-card-strong order-2 overflow-hidden rounded-[28px] p-2 lg:order-1">
          <div className="relative h-[360px] overflow-hidden rounded-[22px] sm:h-[520px]">
            <Image
              src="/cortes/corte1.webp"
              alt="Historia da Jak Barber"
              fill
              sizes="(max-width: 1024px) 100vw, 46vw"
              priority
              className="object-cover"
            />
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-strong)]">
            Sobre nos
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
            A trajetoria da Jak Barber
          </h1>
          <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-300 sm:text-base">
            <p>
              A Jak Barber foi criada para entregar uma experiência simples:
              o cliente chega no horário, senta na cadeira e recebe um atendimento
              feito com calma, técnica e atencao ao detalhe.
            </p>
            <p>
              Com o tempo, a barbearia evoluiu sem perder essa base. A agenda
              passou a ser digital, os serviços ficaram mais organizados e a
              equipe ganhou ferramentas para cuidar melhor de cada atendimento.
            </p>
            <p>
              Hoje, cada corte carrega essa historia: praticidade para marcar,
              cuidado no atendimento e acabamento pensado para o estilo de cada
              cliente.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 border-y border-white/10 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          {timeline.map((item) => (
            <div key={item.label}>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-strong)]">
                {item.label}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-strong)]">
          Registros
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {photos.map((photo) => (
            <div
              key={photo.src}
              className="surface-card overflow-hidden rounded-[24px] p-2"
            >
              <div className="relative h-80 overflow-hidden rounded-[18px]">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
