"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgePercent,
  Boxes,
  CalendarDays,
  Clock,
  CreditCard,
  Home,
  LogIn,
  MessageSquareText,
  Scissors,
  ShoppingBag,
  UserPlus,
  Users,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useId, useRef } from "react";
import { LogoutButton } from "@/components/LogoutButton";

type HeaderRole = "ADMIN" | "BARBER" | "CUSTOMER" | null;

type NavLink = {
  href: string;
  label: string;
};

function getHeaderLinks(role: HeaderRole): {
  homeHref: string;
  eyebrow: string;
  primary: NavLink[];
  secondary: NavLink[];
} {
  if (role === "ADMIN") {
    return {
      homeHref: "/admin",
      eyebrow: "Admin",
      primary: [
        { href: "/admin", label: "Inicio" },
        { href: "/admin/agenda", label: "Agenda" },
        { href: "/admin/barbeiros", label: "Equipe" },
        { href: "/admin/financeiro", label: "Financeiro" },
      ],
      secondary: [
        { href: "/admin/servicos", label: "Servicos" },
        { href: "/admin/produtos", label: "Produtos" },
        { href: "/admin/extras", label: "Extras" },
        { href: "/admin/avaliacoes", label: "Avaliacoes" },
      ],
    };
  }

  if (role === "BARBER") {
    return {
      homeHref: "/barber",
      eyebrow: "Barbeiro",
      primary: [
        { href: "/barber", label: "Hoje" },
        { href: "/barber/agenda", label: "Agenda" },
        { href: "/barber/clientes", label: "Clientes" },
        { href: "/barber/disponibilidade", label: "Pausas" },
      ],
      secondary: [{ href: "/barber/servicos", label: "Meus servicos" }],
    };
  }

  if (role === "CUSTOMER") {
    return {
      homeHref: "/",
      eyebrow: "Cliente",
      primary: [
        { href: "/agendar", label: "Agendar" },
        { href: "/customer/agendamentos", label: "Meus horarios" },
        { href: "/produtos", label: "Arsenal" },
      ],
      secondary: [{ href: "/meu-perfil", label: "Meu cadastro" }],
    };
  }

  return {
    homeHref: "/",
    eyebrow: "JakCompany",
    primary: [
      { href: "/agendar", label: "Agendar" },
      { href: "/servicos", label: "Servicos" },
      { href: "/produtos", label: "Arsenal" },
      { href: "/login", label: "Entrar" },
    ],
    secondary: [{ href: "/register", label: "Criar conta" }],
  };
}

function isActivePath(pathname: string, href: string) {
  if (["/", "/admin", "/barber", "/customer"].includes(href)) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

const navIcons: Record<string, LucideIcon> = {
  "/": Home,
  "/admin": Home,
  "/admin/agenda": CalendarDays,
  "/admin/avaliacoes": MessageSquareText,
  "/admin/barbeiros": Users,
  "/admin/cupons": BadgePercent,
  "/admin/extras": ShoppingBag,
  "/admin/financeiro": WalletCards,
  "/admin/produtos": Boxes,
  "/admin/servicos": Scissors,
  "/agendar": CalendarDays,
  "/barber": Clock,
  "/barber/agenda": CalendarDays,
  "/barber/clientes": Users,
  "/barber/disponibilidade": Clock,
  "/barber/servicos": Scissors,
  "/customer/agendamentos": CalendarDays,
  "/login": LogIn,
  "/meu-perfil": UserRound,
  "/produtos": ShoppingBag,
  "/register": UserPlus,
  "/servicos": Scissors,
};

function NavItemIcon({ href, className }: { href: string; className?: string }) {
  const Icon = navIcons[href] || CreditCard;

  return <Icon aria-hidden="true" className={className} strokeWidth={2.1} />;
}

export default function Header({
  brandName,
  logoPath,
  publicEyebrow,
  role,
  userName,
}: {
  brandName: string;
  logoPath: string;
  publicEyebrow: string;
  role: HeaderRole;
  userName?: string | null;
}) {
  const pathname = usePathname() || "";
  const nav = getHeaderLinks(role);
  const eyebrow = role ? nav.eyebrow : publicEyebrow;
  const menuToggleId = useId();
  const menuToggleRef = useRef<HTMLInputElement | null>(null);

  function closeMenu() {
    if (menuToggleRef.current) {
      menuToggleRef.current.checked = false;
    }
  }

  return (
    <>
      <input
        ref={menuToggleRef}
        id={menuToggleId}
        type="checkbox"
        className="peer sr-only"
        aria-hidden="true"
      />

      <header className="sticky top-0 z-[100] w-full max-w-full overflow-hidden border-b border-white/10 bg-[#030712]/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href={nav.homeHref} className="flex min-w-0 items-center gap-3">
            <Image
              src={logoPath}
              alt={brandName}
              width={120}
              height={50}
              className="h-auto w-[108px] object-contain sm:w-[120px]"
              priority
            />
            {role ? (
              <span className="hidden max-w-[150px] truncate text-xs text-zinc-400 sm:inline">
                {userName || eyebrow}
              </span>
            ) : null}
          </Link>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-2 md:flex">
              {nav.primary.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                    isActivePath(pathname, link.href)
                      ? "bg-[var(--brand-muted)] text-white"
                      : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <NavItemIcon href={link.href} className="h-4 w-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            <div className="relative">
              <label
                htmlFor={menuToggleId}
                aria-label="Abrir menu"
                className="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-white transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)] active:scale-95"
              >
                <span className="absolute h-[2px] w-5 -translate-y-[6px] rounded-full bg-white transition-all duration-300" />
                <span className="absolute h-[2px] w-5 rounded-full bg-white transition-all duration-300" />
                <span className="absolute h-[2px] w-5 translate-y-[6px] rounded-full bg-white transition-all duration-300" />
              </label>
            </div>
          </div>
        </div>
      </header>

      <label
        htmlFor={menuToggleId}
        aria-label="Fechar menu"
        className="pointer-events-none fixed inset-0 z-[140] cursor-pointer bg-black/45 opacity-0 backdrop-blur-[2px] transition peer-checked:pointer-events-auto peer-checked:opacity-100"
      />

      <label
        htmlFor={menuToggleId}
        aria-label="Fechar menu"
        className="pointer-events-none fixed right-4 top-3 z-[160] flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-white/15 bg-[#030712]/95 text-white opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)] active:scale-95 peer-checked:pointer-events-auto peer-checked:opacity-100 sm:right-6"
      >
        <span className="absolute h-[2px] w-5 translate-y-0 rotate-45 rounded-full bg-white" />
        <span className="absolute h-[2px] w-5 translate-y-0 -rotate-45 rounded-full bg-white" />
      </label>

      <div
        className="pointer-events-none fixed left-3 right-3 top-[76px] z-[170] max-w-[calc(100vw-1.5rem)] translate-y-2 rounded-3xl border border-white/10 bg-[#030712]/95 p-3 opacity-0 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition duration-200 peer-checked:pointer-events-auto peer-checked:translate-y-0 peer-checked:opacity-100 sm:left-auto sm:right-4 sm:top-[84px] sm:w-[320px]"
      >
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
          <p className="text-sm font-semibold text-white">Menu</p>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--brand-strong)]">
            {eyebrow}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid gap-2">
            {nav.primary.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={`flex w-full items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold transition active:scale-[0.98] ${
                  isActivePath(pathname, link.href)
                    ? "bg-[var(--brand)] text-white shadow-[0_12px_24px_rgba(37,99,235,0.35)]"
                    : "border border-white/10 bg-white/[0.04] text-white hover:border-[var(--brand)]/40 hover:bg-[var(--brand-muted)]"
                }`}
              >
                <NavItemIcon href={link.href} className="h-5 w-5 shrink-0" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          <div className="grid gap-2 border-t border-white/10 pt-3">
            {nav.secondary.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white transition hover:border-[var(--brand)]/40 hover:bg-[var(--brand-muted)] active:scale-[0.98]"
              >
                <NavItemIcon href={link.href} className="h-5 w-5 shrink-0" />
                <span>{link.label}</span>
              </Link>
            ))}
            {role ? (
              <div className="pt-1" onClick={closeMenu}>
                <LogoutButton />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
