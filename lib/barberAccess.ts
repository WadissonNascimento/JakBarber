import { prisma } from "@/lib/prisma";
import { DEFAULT_SHOP_ID } from "@/lib/shop";

export const ADMIN_BARBER_PROFILE = {
  name: "Jackson Barber",
  email: "jackson.barber@jakbarber.local",
  image: "/uploads/barbers/jackson-barber.jpg",
};

const activeBarberSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  role: true,
  isActive: true,
} as const;

type SessionUserLike = {
  id: string;
  role?: string | null;
  shopId?: string | null;
};

export async function ensureAdminBarberProfile(shopId?: string | null) {
  const targetShopId = shopId || DEFAULT_SHOP_ID;
  const existingByDefaultEmail = await prisma.user.findUnique({
    where: {
      email: ADMIN_BARBER_PROFILE.email,
    },
    select: activeBarberSelect,
  });
  const existing =
    existingByDefaultEmail ||
    (await prisma.user.findFirst({
      where: {
        shopId: targetShopId,
        role: "BARBER",
        name: ADMIN_BARBER_PROFILE.name,
      },
      select: activeBarberSelect,
      orderBy: {
        createdAt: "asc",
      },
    }));

  if (
    existing &&
    existing.role === "BARBER" &&
    existing.isActive &&
    existing.name === ADMIN_BARBER_PROFILE.name
  ) {
    return existing;
  }

  if (existing) {
    return prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        shopId: targetShopId,
        name: ADMIN_BARBER_PROFILE.name,
        role: "BARBER",
        isActive: true,
        image: existing.image || ADMIN_BARBER_PROFILE.image,
      },
      select: activeBarberSelect,
    });
  }

  return prisma.user.create({
    data: {
      shopId: targetShopId,
      name: ADMIN_BARBER_PROFILE.name,
      email: ADMIN_BARBER_PROFILE.email,
      role: "BARBER",
      isActive: true,
      image: ADMIN_BARBER_PROFILE.image,
    },
    select: activeBarberSelect,
  });
}

export async function getActiveBarberForSession(user: SessionUserLike) {
  if (user.role === "ADMIN") {
    return ensureAdminBarberProfile(user.shopId);
  }

  if (user.role !== "BARBER") {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: user.id,
      role: "BARBER",
      isActive: true,
    },
    select: activeBarberSelect,
  });
}
