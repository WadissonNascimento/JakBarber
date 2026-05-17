"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import FeedbackMessage from "@/components/FeedbackMessage";
import PhoneInput from "@/components/ui/PhoneInput";
import { formatBrazilianPhone } from "@/lib/phone";
import { updateAdminShopSettingsAction } from "./actions";

type ShopSettings = {
  name: string;
  slug: string;
  primaryDomain: string | null;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  addressLine: string | null;
  businessHours: string | null;
  metadataTitle: string | null;
  metadataDescription: string | null;
  brandColor: string | null;
  brandColorStrong: string | null;
  emailSettings: {
    fromName: string | null;
    replyToEmail: string | null;
  } | null;
};

type FeedbackState = {
  message: string | null;
  tone: "success" | "error" | "info";
};

export default function ShopSettingsClient({ shop }: { shop: ShopSettings }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackState>({
    message: null,
    tone: "success",
  });
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await updateAdminShopSettingsAction(formData);
          setFeedback({ message: result.message, tone: result.tone });

          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <FeedbackMessage message={feedback.message} tone={feedback.tone} />

      <section className="dashboard-subpanel p-4 sm:p-5">
        <SectionTitle
          eyebrow="Publico"
          title="Dados da barbearia"
          description="Essas informacoes aparecem no site, catalogo, agendamento e contatos publicos."
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Nome publico">
            <input
              name="name"
              required
              minLength={2}
              maxLength={80}
              defaultValue={shop.name}
              className="form-control text-sm"
            />
          </Field>

          <Field label="WhatsApp da barbearia">
            <PhoneInput
              name="whatsappNumber"
              defaultValue={formatBrazilianPhone(shop.whatsappNumber)}
              className="form-control text-sm"
            />
          </Field>

          <Field label="Instagram">
            <input
              name="instagramUrl"
              maxLength={160}
              defaultValue={shop.instagramUrl || ""}
              placeholder="@perfil ou link completo"
              className="form-control text-sm"
            />
          </Field>

          <Field label="Horario de atendimento">
            <input
              name="businessHours"
              maxLength={120}
              defaultValue={shop.businessHours || ""}
              placeholder="Segunda a sabado - 09:00 as 18:00"
              className="form-control text-sm"
            />
          </Field>

          <Field label="Endereco" className="sm:col-span-2">
            <input
              name="addressLine"
              maxLength={180}
              defaultValue={shop.addressLine || ""}
              placeholder="Rua, numero, bairro e cidade"
              className="form-control text-sm"
            />
          </Field>
        </div>
      </section>

      <section className="dashboard-subpanel p-4 sm:p-5">
        <SectionTitle
          eyebrow="E-mails"
          title="Identidade de e-mail"
          description="O SMTP continua sendo da WR Tech; estes dados personalizam o nome e o endereco de resposta da barbearia."
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Nome que aparece no e-mail">
            <input
              name="emailFromName"
              maxLength={80}
              defaultValue={shop.emailSettings?.fromName || shop.name}
              placeholder={shop.name}
              className="form-control text-sm"
            />
          </Field>

          <Field label="E-mail de resposta">
            <input
              name="replyToEmail"
              type="email"
              maxLength={254}
              defaultValue={shop.emailSettings?.replyToEmail || ""}
              placeholder="contato@barbearia.com"
              className="form-control text-sm"
            />
          </Field>
        </div>
      </section>

      <section className="dashboard-subpanel p-4 sm:p-5">
        <SectionTitle
          eyebrow="Visual"
          title="Cores e SEO"
          description="Ajustes leves de marca. Slug e dominio ficam travados para evitar quebrar acessos em producao."
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Cor principal">
            <input
              name="brandColor"
              maxLength={7}
              defaultValue={shop.brandColor || ""}
              placeholder="#C9972B"
              className="form-control text-sm"
            />
          </Field>

          <Field label="Cor de destaque">
            <input
              name="brandColorStrong"
              maxLength={7}
              defaultValue={shop.brandColorStrong || ""}
              placeholder="#D4AF37"
              className="form-control text-sm"
            />
          </Field>

          <Field label="Titulo do navegador">
            <input
              name="metadataTitle"
              maxLength={80}
              defaultValue={shop.metadataTitle || ""}
              placeholder={shop.name}
              className="form-control text-sm"
            />
          </Field>

          <Field label="Descricao para busca">
            <input
              name="metadataDescription"
              maxLength={180}
              defaultValue={shop.metadataDescription || ""}
              placeholder="Agendamento online da barbearia"
              className="form-control text-sm"
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-400 sm:grid-cols-2">
          <ReadOnlyValue label="Slug" value={shop.slug} />
          <ReadOnlyValue label="Dominio" value={shop.primaryDomain || "Nao configurado"} />
        </div>
      </section>

      <div className="sticky bottom-3 z-10 rounded-2xl border border-white/10 bg-[#050810]/90 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur">
        <button type="submit" disabled={isPending} className="btn-primary w-full">
          {isPending ? "Salvando..." : "Salvar configuracoes"}
        </button>
      </div>
    </form>
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
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`.trim()}>
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 truncate font-semibold text-zinc-200">{value}</p>
    </div>
  );
}
