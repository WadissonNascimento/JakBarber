"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function markAdminNotificationReadAction(notificationId: string) {
  const session = await auth();
  const id = notificationId.trim();

  if (!id || !session?.user || session.user.role !== "ADMIN" || !session.user.shopId) {
    return;
  }

  await prisma.appNotification.updateMany({
    where: {
      id,
      shopId: session.user.shopId,
      recipientUserId: session.user.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/admin");
}

