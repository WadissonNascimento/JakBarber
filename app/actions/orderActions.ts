"use server";

import { auth } from "@/auth";
import { reserveInventoryForOrder } from "@/lib/orderInventory";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ORDER_STATUSES } from "@/lib/orderStatus";
import { roundMoney, toMoneyNumber } from "@/lib/money";

const orderInclude = {
  customer: true,
  coupon: true,
  items: {
    include: {
      product: true,
    },
  },
} as const;

export async function createOrder(data: {
  items: {
    productId: string;
    quantity: number;
  }[];
}) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    throw new Error("Usuario nao autenticado.");
  }

  if (data.items.length === 0) {
    throw new Error("O pedido precisa ter pelo menos um item.");
  }

  if (
    data.items.some(
      (item) =>
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
    )
  ) {
    throw new Error("Os itens enviados para o pedido sao invalidos.");
  }

  let total = 0;

  const itemsWithPrice = await Promise.all(
    data.items.map(async (item) => {
      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          shopId: session.user.shopId || undefined,
          isActive: true,
        },
      });

      if (!product) {
        throw new Error("Produto nao encontrado.");
      }

      if (product.stock < item.quantity) {
        throw new Error(`Estoque insuficiente para ${product.name}.`);
      }

      const unitPrice = toMoneyNumber(product.price);
      total += unitPrice * item.quantity;

      return {
        productId: item.productId,
        productNameSnapshot: product.name,
        quantity: item.quantity,
        unitPrice,
      };
    })
  );

  const order = await prisma.order.create({
    data: {
      shopId: session.user.shopId || undefined,
      customerId: session.user.id,
      total: roundMoney(total),
      items: {
        create: itemsWithPrice.map((item) => ({
          ...item,
          shopId: session.user.shopId || undefined,
        })),
      },
    },
    include: orderInclude,
  });

  revalidatePath("/carrinho");
  revalidatePath("/meus-pedidos");
  revalidatePath("/admin/pedidos");

  return order;
}

export async function getOrders() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Nao autorizado.");
  }

  return prisma.order.findMany({
    include: orderInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getMyOrders(customerId?: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Nao autenticado.");
  }

  const targetCustomerId = customerId || session.user.id;

  if (session.user.role !== "ADMIN" && targetCustomerId !== session.user.id) {
    throw new Error("Nao autorizado.");
  }

  return prisma.order.findMany({
    where: {
      customerId: targetCustomerId,
    },
    include: orderInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function confirmOrder(orderId: string) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Nao autorizado.");
  }

  if (!orderId) {
    throw new Error("Pedido invalido.");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CONFIRMED",
    },
  });

  await reserveInventoryForOrder(orderId);

  revalidatePath("/admin/pedidos");
  revalidatePath("/meus-pedidos");
  revalidatePath("/admin/produtos");
}

export async function saveTrackingCode(orderId: string, trackingCode: string) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Nao autorizado.");
  }

  if (!orderId) {
    throw new Error("Pedido invalido.");
  }

  const normalizedCode = trackingCode.trim().toUpperCase();

  if (!normalizedCode) {
    throw new Error("Informe um codigo de rastreio valido.");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingCode: normalizedCode,
      status: "SHIPPED",
    },
  });

  revalidatePath("/admin/pedidos");
  revalidatePath("/meus-pedidos");
}

export async function updateOrderStatus(orderId: string, status: string) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Nao autorizado.");
  }

  if (!orderId || !ORDER_STATUSES.includes(status as never)) {
    throw new Error("Status de pedido invalido.");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  if (status === "CONFIRMED") {
    await reserveInventoryForOrder(orderId);
  }

  revalidatePath("/admin/pedidos");
  revalidatePath("/meus-pedidos");
  revalidatePath("/admin/produtos");
}

export async function deleteOrder(orderId: string) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Nao autorizado.");
  }

  if (!orderId) {
    throw new Error("Pedido invalido.");
  }

  await prisma.order.delete({
    where: { id: orderId },
  });

  revalidatePath("/admin/pedidos");
  revalidatePath("/meus-pedidos");
}
