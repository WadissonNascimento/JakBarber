import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OrderInventoryPrismaClient = Pick<
  PrismaClient,
  "$transaction" | "order" | "product" | "stockMovement"
>;

export async function reserveInventoryForOrder(
  orderId: string,
  db: OrderInventoryPrismaClient = prisma
) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.adminApproved) {
      return;
    }

    for (const item of order.items) {
      const updated = await tx.product.updateMany({
        where: {
          id: item.productId,
          isActive: true,
          stock: {
            gte: item.quantity,
          },
        },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      if (updated.count !== 1) {
        throw new Error(
          `Estoque insuficiente para ${item.productNameSnapshot}.`
        );
      }

      await tx.stockMovement.create({
        data: {
          shopId: order.shopId,
          productId: item.productId,
          type: "OUT",
          quantity: item.quantity,
          reason: `Baixa automatica do pedido ${order.id.slice(-6).toUpperCase()}`,
        },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        adminApproved: true,
      },
    });
  });
}
