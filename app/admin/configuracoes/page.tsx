import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BackLink from "@/components/ui/BackLink";
import DashboardShell from "@/components/ui/DashboardShell";
import ShopSettingsClient from "./ShopSettingsClient";

export default async function AdminShopSettingsPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/painel");
  if (!session.user.shopId) redirect("/logout");

  const shop = await prisma.shop.findUnique({
    where: {
      id: session.user.shopId,
    },
    select: {
      name: true,
      slug: true,
      primaryDomain: true,
      whatsappNumber: true,
      instagramUrl: true,
      addressLine: true,
      businessHours: true,
      metadataTitle: true,
      metadataDescription: true,
      brandColor: true,
      brandColorStrong: true,
      emailSettings: {
        select: {
          fromName: true,
          replyToEmail: true,
        },
      },
    },
  });

  if (!shop) {
    redirect("/logout");
  }

  return (
    <DashboardShell size="wide">
      <section className="dashboard-panel p-4 sm:p-6">
        <div className="mb-5">
          <BackLink href="/admin" area="Admin" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
            Configuracoes
          </p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            Dados da barbearia
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Atualize contato publico, identidade de e-mail e ajustes basicos
            desta barbearia. As alteracoes ficam isoladas nesta shop.
          </p>
        </div>

        <ShopSettingsClient shop={shop} />
      </section>
    </DashboardShell>
  );
}
