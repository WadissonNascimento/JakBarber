import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BookingClient from "./BookingClient";

export const metadata = {
  title: "Agendar horário",
  description: "Escolha barbeiro, serviço, data e horário para agendar na Jak Barber.",
};

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextDays(count: number) {
  const days: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  for (let index = 0; index < count; index += 1) {
    const current = new Date(base);
    current.setDate(base.getDate() + index);

    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");

    days.push(`${year}-${month}-${day}`);
  }

  return days;
}

export default async function AgendarPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "CUSTOMER") {
    redirect("/painel");
  }

  const [barbers, services, extras] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "BARBER",
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        image: true,
      },
    }),
    prisma.service.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        barberId: true,
        name: true,
        price: true,
        duration: true,
        bufferAfter: true,
      },
    }),
    prisma.extraProduct.findMany({
      where: {
        isActive: true,
        stock: {
          gt: 0,
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        price: true,
        stock: true,
        imageUrl: true,
      },
    }),
  ]);

  return (
    <BookingClient
      barbers={barbers}
      services={services}
      extras={extras}
      initialDate={getTodayString()}
      nextDays={getNextDays(12)}
      whatsappNumber={process.env.BARBER_WHATSAPP_NUMBER || ""}
    />
  );
}
