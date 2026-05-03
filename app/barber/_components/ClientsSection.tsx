import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { saveClientNoteAction } from "../actions";
import type { getBarberDashboardData } from "../data";

type BarberDashboardData = Awaited<ReturnType<typeof getBarberDashboardData>>;

export function ClientsSection({
  clients,
  redirectTo,
}: {
  clients: BarberDashboardData["clients"];
  redirectTo: string;
}) {
  return (
    <SectionCard
      title="Clientes"
      description="Consulte quem já passou pela sua cadeira e salve observações úteis."
      className="rounded-[28px] bg-zinc-900/90"
    >
      <div className="mt-6 space-y-4">
        <form
          action="/barber/clientes"
          className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              name="q"
              placeholder="Pesquisar cliente por nome, email ou telefone"
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.28)] transition hover:brightness-110"
            >
              Pesquisar cliente
            </button>
          </div>
        </form>

        {clients.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Seus clientes aparecerão aqui conforme novos atendimentos forem realizados."
          />
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5"
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_170px_190px_1.3fr]">
                <div>
                  <Link
                    href={`/barber/clientes/${client.id}`}
                    className="text-lg font-semibold text-white transition hover:text-[var(--brand)]"
                  >
                    {client.name}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-400">
                    {client.phone || client.email || "Contato não informado"}
                  </p>
                  <Link
                    href={`/barber/clientes/${client.id}`}
                    className="mt-3 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    Abrir perfil
                  </Link>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    último atendimento
                  </p>
                  <p className="mt-2 text-sm text-white">
                    {new Date(client.lastAppointment).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    Total de atendimentos
                  </p>
                  <p className="mt-2 text-sm text-white">{client.totalAppointments}</p>
                </div>

                <form
                  action={async (formData) => {
                    "use server";
                    await saveClientNoteAction(formData);
                  }}
                >
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <input type="hidden" name="customerId" value={client.id} />
                  <label className="block">
                    <span className="mb-2 block text-sm text-zinc-300">Observação</span>
                    <textarea
                      name="note"
                      defaultValue={client.note}
                      rows={3}
                      placeholder="Preferências, alergias, estilo recorrente..."
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>
                  <button
                    type="submit"
                    className="mt-3 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    Salvar observação
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}
