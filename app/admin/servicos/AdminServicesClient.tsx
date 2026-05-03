"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import {
  createAdminServiceAction,
  deleteGlobalServiceAction,
  toggleGlobalServiceAction,
  updateGlobalServiceAction,
} from "./actions";

type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  commissionValue: number;
  isActive: boolean;
  barber: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

type BarberOption = {
  id: string;
  name: string | null;
  email: string | null;
};

export default function AdminServicesClient({
  globalServices,
  barberServices,
  barbers,
}: {
  globalServices: ServiceItem[];
  barberServices: ServiceItem[];
  barbers: BarberOption[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    message: string | null;
    tone: "success" | "error" | "info";
  }>({ message: null, tone: "success" });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [serviceScope, setServiceScope] = useState<"GLOBAL" | "EXCLUSIVE">("GLOBAL");

  function runAction(
    key: string,
    action: (formData: FormData) => Promise<{
      ok: boolean;
      message: string;
      tone: "success" | "error" | "info";
    }>,
    formData: FormData,
    onSuccess?: () => void
  ) {
    setPendingKey(key);

    startTransition(async () => {
      const result = await action(formData);
      setFeedback({ message: result.message, tone: result.tone });

      if (result.ok) {
        onSuccess?.();
        router.refresh();
      }

      setPendingKey(null);
    });
  }

  return (
    <>
      <div className="mb-6 space-y-3">
        <FeedbackMessage message={feedback.message} tone={feedback.tone} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <form
          className="overflow-hidden rounded-[32px] border border-sky-500/20 bg-[linear-gradient(180deg,rgba(16,26,46,0.98),rgba(10,15,28,0.98))] shadow-[0_24px_80px_rgba(2,132,199,0.16)]"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;

            runAction(
              "create-service",
              createAdminServiceAction,
              new FormData(form),
              () => {
                form.reset();
                setServiceScope("GLOBAL");
              }
            );
          }}
        >
          <div className="border-b border-white/10 bg-white/[0.03] px-6 py-5">
            <p className="text-xs uppercase tracking-[0.24em] text-sky-300">
              Cadastro
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Novo serviço
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Crie um serviço geral da casa ou um serviço exclusivo de um barbeiro,
              sem sair do painel do admin.
            </p>
          </div>

          <div className="space-y-5 px-6 py-6">
            <input type="hidden" name="serviceScope" value={serviceScope} />

            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-black/20 p-2">
              <button
                type="button"
                onClick={() => setServiceScope("GLOBAL")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  serviceScope === "GLOBAL"
                    ? "bg-[var(--brand)] text-white shadow-[0_12px_30px_rgba(14,165,233,0.28)]"
                    : "text-zinc-300 hover:bg-white/5"
                }`}
              >
                Serviço geral
              </button>

              <button
                type="button"
                onClick={() => setServiceScope("EXCLUSIVE")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  serviceScope === "EXCLUSIVE"
                    ? "bg-[var(--brand)] text-white shadow-[0_12px_30px_rgba(14,165,233,0.28)]"
                    : "text-zinc-300 hover:bg-white/5"
                }`}
              >
                Serviço exclusivo
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
              {serviceScope === "GLOBAL"
                ? "Esse serviço entra na agenda de qualquer barbeiro disponível."
                : "Esse serviço vai ficar disponível apenas para o barbeiro selecionado."}
            </div>

            {serviceScope === "EXCLUSIVE" ? (
              <Field label="Barbeiro responsavel">
                <select
                  name="barberId"
                  required
                  defaultValue=""
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40 focus:bg-zinc-950"
                >
                  <option value="" disabled>
                    Selecione o barbeiro
                  </option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name || barber.email || "Barbeiro"}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field label="Nome">
              <input
                name="name"
                required
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40 focus:bg-zinc-950"
                placeholder={
                  serviceScope === "GLOBAL"
                    ? "Ex.: Corte + barba"
                    : "Ex.: Platinado premium"
                }
              />
            </Field>

            <Field label="Descrição">
              <textarea
                name="description"
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40 focus:bg-zinc-950"
                placeholder="Detalhes que ajudam na agenda e no entendimento do atendimento."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preco">
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  name="price"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40 focus:bg-zinc-950"
                />
              </Field>

              <Field label="Duração (min)">
                <input
                  type="number"
                  min="10"
                  step="5"
                  name="duration"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40 focus:bg-zinc-950"
                />
              </Field>
            </div>

            <Field label="Comissão do barbeiro (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                name="commissionValue"
                defaultValue={40}
                required
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40 focus:bg-zinc-950"
              />
            </Field>

            <button
              type="submit"
              disabled={isPending && pendingKey === "create-service"}
              className="w-full rounded-2xl bg-[var(--brand)] px-4 py-3.5 font-semibold text-white shadow-[0_18px_40px_rgba(14,165,233,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && pendingKey === "create-service"
                ? "Criando..."
                : serviceScope === "EXCLUSIVE"
                ? "Criar serviço exclusivo"
                : "Criar serviço geral"}
            </button>
          </div>
        </form>

        <div className="space-y-8">
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white">Serviços gerais</h2>
              <p className="text-sm text-zinc-400">
                Disponíveis para qualquer barbeiro, com repasse definido pelo admin.
              </p>
            </div>

            <div className="space-y-4">
              {globalServices.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-900 p-6 text-sm text-zinc-400">
                  Nenhum serviço geral cadastrado.
                </div>
              ) : (
                globalServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isPending={isPending}
                    pendingKey={pendingKey}
                    onRunAction={runAction}
                  />
                ))
              )}
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white">Serviços exclusivos dos barbeiros</h2>
              <p className="text-sm text-zinc-400">
                Criados e controlados pelo admin para barbeiros especificos.
              </p>
            </div>

            <div className="space-y-4">
              {barberServices.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-900 p-6 text-sm text-zinc-400">
                  Nenhum serviço exclusivo cadastrado.
                </div>
              ) : (
                barberServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isPending={isPending}
                    pendingKey={pendingKey}
                    onRunAction={runAction}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function ServiceCard({
  service,
  isPending,
  pendingKey,
  onRunAction,
}: {
  service: ServiceItem;
  isPending: boolean;
  pendingKey: string | null;
  onRunAction: (
    key: string,
    action: (formData: FormData) => Promise<{
      ok: boolean;
      message: string;
      tone: "success" | "error" | "info";
    }>,
    formData: FormData
  ) => void;
}) {
  const ownerLabel = service.barber
    ? `Exclusivo de ${service.barber.name || service.barber.email || "Barbeiro"}`
    : "Serviço geral";

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">{service.name}</p>
          <p className="text-sm text-zinc-400">{ownerLabel}</p>
          <p className="text-xs text-zinc-500">
            {service.isActive ? "Ativo para agendamento" : "Desativado"} - Comissão:{" "}
            {service.commissionValue}%
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending && pendingKey === `toggle-${service.id}`}
            onClick={() => {
              const formData = new FormData();
              formData.set("serviceId", service.id);
              onRunAction(`toggle-${service.id}`, toggleGlobalServiceAction, formData);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              service.isActive
                ? "bg-zinc-800 text-white hover:bg-zinc-700"
                : "bg-green-600 text-white hover:bg-green-500"
            }`}
          >
            {isPending && pendingKey === `toggle-${service.id}`
              ? "Salvando..."
              : service.isActive
              ? "Desativar"
              : "Ativar"}
          </button>

          <button
            type="button"
            disabled={isPending && pendingKey === `delete-${service.id}`}
            onClick={() => {
              if (
                !window.confirm(
                  "Excluir serviço? Se houver agendamentos no histórico, ele será apenas desativado."
                )
              ) {
                return;
              }

              const formData = new FormData();
              formData.set("serviceId", service.id);
              onRunAction(`delete-${service.id}`, deleteGlobalServiceAction, formData);
            }}
            className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending && pendingKey === `delete-${service.id}` ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onRunAction(`update-${service.id}`, updateGlobalServiceAction, formData);
        }}
      >
        <input type="hidden" name="serviceId" value={service.id} />

        <Field label="Nome">
          <input
            name="name"
            defaultValue={service.name}
            required
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
          />
        </Field>

        <Field label="Descrição">
          <textarea
            name="description"
            defaultValue={service.description || ""}
            rows={3}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preco">
            <input
              type="number"
              step="0.01"
              min="1"
              name="price"
              defaultValue={service.price}
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
            />
          </Field>

          <Field label="Duração (min)">
            <input
              type="number"
              min="10"
              step="5"
              name="duration"
              defaultValue={service.duration}
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
            />
          </Field>
        </div>

        <Field label="Comissão do barbeiro (%)">
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            name="commissionValue"
            defaultValue={service.commissionValue}
            required
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
          />
        </Field>

        <button
          type="submit"
          disabled={isPending && pendingKey === `update-${service.id}`}
          className="justify-self-start rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && pendingKey === `update-${service.id}`
            ? "Salvando..."
            : "Salvar alteracoes"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-300">{label}</span>
      {children}
    </label>
  );
}
