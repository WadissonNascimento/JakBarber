import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import AdminReviewsClient from "./AdminReviewsClient";

export default async function AdminReviewsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/painel");
  }

  const reviews = await prisma.review.findMany({
    include: {
      customer: {
        select: {
          name: true,
          email: true,
        },
      },
      barber: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="page-shell max-w-6xl text-white">
      <PageHeader
        eyebrow="Admin"
        title="Avaliações"
        description="Publique, oculte ou remova avaliações exibidas no site."
        actions={
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/5"
          >
            Voltar ao admin
          </Link>
        }
      />

      <SectionCard
        title="Avaliações dos clientes"
        description="Somente avaliações públicas aparecem na home e na página de avaliações."
      >
        <AdminReviewsClient reviews={reviews} />
      </SectionCard>
    </main>
  );
}
