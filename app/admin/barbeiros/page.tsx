import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BackLink from "@/components/ui/BackLink";
import DashboardShell from "@/components/ui/DashboardShell";
import { readPageFeedback } from "@/lib/pageFeedback";
import AdminBarbersClient from "./AdminBarbersClient";

export default async function AdminBarbersPage({
  searchParams,
}: {
  searchParams?: { feedback?: string; tone?: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/painel");
  }

  const now = new Date();
  const [barbers, pendingBarbers] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "BARBER",
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        barberAppointments: true,
      },
    }),
    prisma.pendingRegistration.findMany({
      where: {
        role: "BARBER",
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const feedback = readPageFeedback(searchParams);

  return (
    <DashboardShell>
      <section className="dashboard-panel p-4 sm:p-6">
        <div className="mb-5">
          <BackLink href="/admin" area="Admin" />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
            Painel admin
          </p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            Gerenciamento
          </h1>
        </div>

        <AdminBarbersClient
          barbers={barbers}
          pendingBarbers={pendingBarbers}
          initialFeedback={feedback}
        />
      </section>
    </DashboardShell>
  );
}
