"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";

type ClientItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lastAppointment: Date;
  totalAppointments: number;
};

export default function ClientsDirectoryClient({
  clients,
  search,
}: {
  clients: ClientItem[];
  search: string;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/barber/clientes";
  const [query, setQuery] = useState(search);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <SectionCard title="Busca de clientes" description="Encontre por nome, e-mail ou telefone.">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = query.trim();

            startTransition(() => {
              router.replace(
                trimmed ? `${pathname}?q=${encodeURIComponent(trimmed)}` : pathname,
                { scroll: false }
              );
            });
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, email ou telefone"
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </form>
      </SectionCard>

      <div className="mt-6 space-y-4">
        {clients.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Revise a busca ou aguarde novos atendimentos para ampliar sua base."
          />
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center">
                <div>
                  <p className="text-lg font-semibold text-white">{client.name}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {client.email || client.phone || "Sem contato"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Ultimo atendimento
                  </p>
                  <p className="mt-2 text-sm text-white">
                    {new Date(client.lastAppointment).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Total de atendimentos
                  </p>
                  <p className="mt-2 text-sm text-white">{client.totalAppointments}</p>
                </div>
                <Link
                  href={`/barber/clientes/${client.id}`}
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                >
                  Abrir perfil
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
