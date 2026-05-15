import Image from "next/image";
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock3,
  CreditCard,
  LineChart,
  MessageCircle,
  MonitorSmartphone,
  Package,
  Scissors,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  WR_TECH_HEADER_LOGO_PATH,
} from "@/lib/wrTechInstitutional";

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WRTECH_WHATSAPP ||
  process.env.WRTECH_WHATSAPP_NUMBER ||
  process.env.BARBER_WHATSAPP_NUMBER ||
  "5511961971267";

const WHATSAPP_MESSAGE =
  "Ola! Quero conhecer o sistema da WR Tech Solutions para barbearias.";

function whatsappHref(message = WHATSAPP_MESSAGE) {
  const digits = WHATSAPP_NUMBER.replace(/\D/g, "");

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

type FeatureCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const customerSteps: FeatureCard[] = [
  {
    title: "Acessa o site",
    description: "O cliente entra no site oficial da barbearia pelo celular.",
    icon: MonitorSmartphone,
  },
  {
    title: "Escolhe o atendimento",
    description: "Seleciona servico, barbeiro, data e horario disponivel.",
    icon: Scissors,
  },
  {
    title: "Confirma o horario",
    description: "O agendamento fica registrado e organizado para a equipe.",
    icon: CalendarCheck,
  },
  {
    title: "Acompanha pelo perfil",
    description: "O cliente visualiza seus horarios e historico quando precisar.",
    icon: UserRoundCheck,
  },
];

const barberPanelCards: FeatureCard[] = [
  {
    title: "Agenda diaria e semanal",
    description: "Visao clara dos proximos horarios e atendimentos.",
    icon: CalendarDays,
  },
  {
    title: "Controle de atendimentos",
    description: "Atualizacao de status e rotina mais organizada.",
    icon: ClipboardList,
  },
  {
    title: "Lista de clientes",
    description: "Base de clientes vinculada aos atendimentos do barbeiro.",
    icon: Users,
  },
  {
    title: "Historico e observacoes",
    description: "Informacoes importantes para melhorar o atendimento.",
    icon: ShieldCheck,
  },
  {
    title: "Financeiro individual",
    description: "Acompanhamento dos valores e producao do profissional.",
    icon: WalletCards,
  },
];

const adminPanelCards: FeatureCard[] = [
  {
    title: "Agenda geral",
    description: "Todos os horarios da barbearia em uma visao centralizada.",
    icon: CalendarDays,
  },
  {
    title: "Cadastro de barbeiros",
    description: "Equipe, perfis e disponibilidade organizados por unidade.",
    icon: Users,
  },
  {
    title: "Cadastro de servicos",
    description: "Precos, duracao e servicos ativos sob controle do admin.",
    icon: Scissors,
  },
  {
    title: "Catalogo de produtos",
    description: "Produtos e extras apresentados de forma profissional.",
    icon: Package,
  },
  {
    title: "Controle financeiro",
    description: "Totais, filtros e acompanhamento mais claro da operacao.",
    icon: CreditCard,
  },
  {
    title: "Relatorios e rankings",
    description: "Indicadores para acompanhar desempenho da barbearia.",
    icon: BarChart3,
  },
  {
    title: "Comissoes e repasses",
    description: "Gestao de pagamentos com menos planilha e retrabalho.",
    icon: LineChart,
  },
];

const benefits: FeatureCard[] = [
  {
    title: "Menos bagunca no WhatsApp",
    description: "Conversas deixam de ser o unico lugar onde tudo acontece.",
    icon: MessageCircle,
  },
  {
    title: "Horarios organizados",
    description: "Agenda clara para cliente, barbeiro e administrador.",
    icon: Clock3,
  },
  {
    title: "Visual profissional",
    description: "A barbearia ganha uma presenca digital mais forte.",
    icon: Sparkles,
  },
  {
    title: "Financeiro mais claro",
    description: "Informacoes de producao e valores ficam mais faceis de ler.",
    icon: WalletCards,
  },
  {
    title: "Adaptado por barbearia",
    description: "Marca, dominio, servicos, equipe e identidade separados.",
    icon: Settings2,
  },
  {
    title: "Acesso pelo celular",
    description: "O sistema foi pensado para a rotina real da barbearia.",
    icon: MonitorSmartphone,
  },
];

const plans = [
  {
    name: "Plano Inicial",
    audience: "Para barbearias pequenas",
    limit: "Ate 2 barbeiros",
    price: "R$ 70/mes",
  },
  {
    name: "Plano Profissional",
    audience: "Para barbearias em crescimento",
    limit: "Ate 5 barbeiros",
    price: "R$ 90/mes",
    highlighted: true,
  },
  {
    name: "Plano Avancado",
    audience: "Para barbearias maiores",
    limit: "6+ barbeiros",
    price: "A partir de R$ 150/mes",
  },
];

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-300">{description}</p>
    </div>
  );
}

function CardGrid({
  items,
  columns = "lg:grid-cols-4",
}: {
  items: FeatureCard[];
  columns?: string;
}) {
  return (
    <div className={`mt-8 grid gap-3 sm:grid-cols-2 ${columns}`}>
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <article
            key={item.title}
            className="rounded-lg border border-white/10 bg-white/[0.065] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-300/12 text-cyan-200">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-black text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
          </article>
        );
      })}
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto mt-8 max-w-5xl overflow-hidden rounded-lg border border-cyan-200/20 bg-[#07111f]/90 shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-cyan-300" />
          <span className="h-3 w-3 rounded-full bg-slate-500" />
          <span className="h-3 w-3 rounded-full bg-white/40" />
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Preview do sistema
        </span>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            Cliente
          </p>
          <h3 className="mt-3 text-xl font-black text-white">Agendamento online</h3>
          <div className="mt-4 grid gap-2 text-sm text-slate-300">
            <span className="rounded-lg bg-white/8 px-3 py-2">Corte + Barba</span>
            <span className="rounded-lg bg-white/8 px-3 py-2">Barbeiro selecionado</span>
            <span className="rounded-lg bg-cyan-300 px-3 py-2 font-black text-[#06101d]">
              Confirmar horario
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            Barbeiro
          </p>
          <h3 className="mt-3 text-xl font-black text-white">Agenda do dia</h3>
          <div className="mt-4 grid gap-2 text-sm text-slate-300">
            <span className="flex justify-between rounded-lg bg-white/8 px-3 py-2">
              <span>09:00</span>
              <span>Corte</span>
            </span>
            <span className="flex justify-between rounded-lg bg-white/8 px-3 py-2">
              <span>10:30</span>
              <span>Barba</span>
            </span>
            <span className="flex justify-between rounded-lg bg-white/8 px-3 py-2">
              <span>14:00</span>
              <span>Combo</span>
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            Admin
          </p>
          <h3 className="mt-3 text-xl font-black text-white">Controle da barbearia</h3>
          <div className="mt-4 grid gap-2 text-sm text-slate-300">
            <span className="flex justify-between rounded-lg bg-white/8 px-3 py-2">
              <span>Agenda</span>
              <span className="text-cyan-200">Ativa</span>
            </span>
            <span className="flex justify-between rounded-lg bg-white/8 px-3 py-2">
              <span>Financeiro</span>
              <span className="text-cyan-200">Claro</span>
            </span>
            <span className="flex justify-between rounded-lg bg-white/8 px-3 py-2">
              <span>Equipe</span>
              <span className="text-cyan-200">Organizada</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WrTechSolutionsLanding() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#05070b] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_16%_4%,_rgba(34,211,238,0.24),_transparent_28%),radial-gradient(circle_at_88%_10%,_rgba(219,234,254,0.14),_transparent_25%),linear-gradient(180deg,_#05070b_0%,_#07111f_44%,_#05070b_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.14] [background-image:linear-gradient(rgba(148,205,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(148,205,255,0.18)_1px,transparent_1px)] [background-size:34px_34px]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070b]/92 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <a href="#topo" className="flex min-w-0 items-center">
            <Image
              src={WR_TECH_HEADER_LOGO_PATH}
              alt="WR Tech Solutions"
              width={260}
              height={82}
              priority
              className="h-12 w-[170px] rounded-lg object-cover object-center sm:w-[220px]"
            />
          </a>
          <nav className="hidden items-center gap-2 md:flex">
            <a href="#funcionalidades" className="rounded-full px-4 py-2 text-sm text-slate-200 transition hover:bg-white/8 hover:text-white">
              Funcionalidades
            </a>
            <a href="#planos" className="rounded-full px-4 py-2 text-sm text-slate-200 transition hover:bg-white/8 hover:text-white">
              Planos
            </a>
            <a href="#demo" className="rounded-full px-4 py-2 text-sm text-slate-200 transition hover:bg-white/8 hover:text-white">
              Demonstracao
            </a>
          </nav>
          <a
            href={whatsappHref()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-black text-[#06101d] transition hover:bg-white active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp
          </a>
        </div>
      </header>

      <section id="topo" className="px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-white/8 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">
              <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden="true" />
              SaaS para barbearias
            </div>

            <div className="mx-auto mt-5 flex max-w-xl justify-center">
              <Image
                src={WR_TECH_HEADER_LOGO_PATH}
                alt="WR Tech Solutions"
                width={900}
                height={282}
                priority
                className="w-full max-w-[390px] rounded-lg object-cover object-center"
              />
            </div>

            <h1 className="mt-6 text-[2.35rem] font-black leading-[1.03] tracking-normal text-white sm:text-6xl lg:text-7xl">
              Transforme sua barbearia em uma operação digital
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-xl">
              A WR Tech Solutions desenvolve sistemas completos para barbearias
              com agendamento online, painel do barbeiro, painel administrativo,
              controle financeiro e gestão profissional.
            </p>

            <div className="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
              <a
                href={whatsappHref()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 text-base font-black text-[#06101d] shadow-[0_18px_44px_rgba(34,211,238,0.24)] transition hover:bg-white active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Falar no WhatsApp
              </a>
              <a
                href="#funcionalidades"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/8 px-5 text-base font-black text-white transition hover:border-cyan-300/45 hover:bg-cyan-300/10 active:scale-[0.98]"
              >
                Ver funcionalidades
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section id="funcionalidades" className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Cliente"
            title="Como funciona para o cliente"
            description="Uma jornada simples, pensada para a pessoa abrir no celular e marcar horario sem bagunca."
          />
          <CardGrid items={customerSteps} />
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.035] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Barbeiro"
            title="Painel do barbeiro"
            description="O profissional acompanha sua rotina, seus clientes e seus resultados em uma experiencia direta."
          />
          <CardGrid items={barberPanelCards} columns="lg:grid-cols-5" />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Administrador"
            title="Painel administrativo"
            description="O dono acompanha a barbearia com mais organizacao, controle e visao do que esta acontecendo."
          />
          <CardGrid items={adminPanelCards} columns="lg:grid-cols-4" />
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.035] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Beneficios"
            title="Mais organizacao para vender mais e se perder menos"
            description="O sistema centraliza a operacao sem tirar a simplicidade que a barbearia precisa no dia a dia."
          />
          <CardGrid items={benefits} columns="lg:grid-cols-3" />
        </div>
      </section>

      <section id="planos" className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Planos"
            title="Planos para cada fase da barbearia"
            description="Comece pequeno ou avance com uma estrutura preparada para mais equipe, mais agenda e mais controle."
          />

          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-lg border p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)] ${
                  plan.highlighted
                    ? "border-cyan-300/45 bg-cyan-300/12"
                    : "border-white/10 bg-white/[0.065]"
                }`}
              >
                {plan.highlighted ? (
                  <p className="mb-4 inline-flex rounded-full bg-cyan-300 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#06101d]">
                    Mais escolhido
                  </p>
                ) : null}
                <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{plan.audience}</p>
                <p className="mt-2 text-sm font-bold text-cyan-100">{plan.limit}</p>
                <p className="mt-6 text-3xl font-black text-cyan-200">{plan.price}</p>
                <a
                  href={whatsappHref(`Ola! Quero saber mais sobre o ${plan.name} da WR Tech Solutions.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-[#06101d] transition hover:bg-cyan-300 active:scale-[0.98]"
                >
                  Conversar sobre este plano
                </a>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-cyan-300/25 bg-white/[0.065] p-5 text-sm leading-7 text-slate-300">
            <span className="font-black text-white">Taxa de implementacao:</span>{" "}
            Valor unico cobrado para configurar identidade visual, servicos,
            barbeiros, horarios, dominio, informacoes da barbearia e ajustes iniciais.
          </div>
        </div>
      </section>

      <section id="demo" className="border-y border-white/10 bg-white/[0.035] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
            Demonstracao do sistema
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">
            Veja o sistema funcionando antes de decidir
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Mostramos na pratica como funciona o agendamento online, o painel
            do barbeiro e o painel administrativo.
          </p>
          <a
            href={whatsappHref("Ola! Quero solicitar uma demonstracao guiada do sistema para barbearias.")}
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-6 text-base font-black text-[#06101d] shadow-[0_18px_44px_rgba(34,211,238,0.24)] transition hover:bg-white active:scale-[0.98]"
          >
            Solicitar demonstracao
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </section>

      <section id="contato" className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-lg border border-cyan-300/25 bg-[linear-gradient(135deg,_rgba(34,211,238,0.16),_rgba(255,255,255,0.06))] p-6 text-center shadow-[0_26px_80px_rgba(0,0,0,0.28)] sm:p-10">
          <h2 className="text-3xl font-black leading-tight text-white sm:text-5xl">
            Quer ver esse sistema funcionando na sua barbearia?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Entre em contato com a WR Tech Solutions e receba uma demonstracao personalizada.
          </p>
          <a
            href={whatsappHref()}
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-white px-6 text-base font-black text-[#06101d] transition hover:bg-cyan-300 active:scale-[0.98]"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Chamar no WhatsApp
          </a>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3">
          <Image
            src={WR_TECH_HEADER_LOGO_PATH}
            alt="WR Tech Solutions"
            width={220}
            height={70}
            className="h-10 w-[150px] rounded-lg object-cover object-center"
          />
          <p>WR Tech Solutions - Sistemas para barbearias.</p>
        </div>
      </footer>
    </main>
  );
}
