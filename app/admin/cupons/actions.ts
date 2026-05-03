"use server";

import { auth } from "@/auth";
import {
  mutationError,
  mutationSuccess,
  type MutationResult,
} from "@/lib/mutationResult";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Nao autorizado.");
  }

  return session.user;
}

function revalidateCoupons() {
  revalidatePath("/admin");
  revalidatePath("/admin/cupons");
  revalidatePath("/carrinho");
}

export async function createCouponAction(
  formData: FormData
): Promise<MutationResult> {
  const admin = await requireAdmin();

  const code = String(formData.get("code") || "").trim().toUpperCase();
  const description = String(formData.get("description") || "").trim();
  const discountType = String(formData.get("discountType") || "PERCENT");
  const discountValue = Number(formData.get("discountValue") || 0);
  const minOrderTotal = Number(formData.get("minOrderTotal") || 0);
  const maxDiscountRaw = String(formData.get("maxDiscount") || "").trim();
  const usageLimitRaw = String(formData.get("usageLimit") || "").trim();
  const expiresAtRaw = String(formData.get("expiresAt") || "").trim();

  if (!code || discountValue <= 0) {
    return mutationError("Preencha codigo e valor do desconto corretamente.");
  }

  await prisma.coupon.create({
    data: {
      shopId: admin.shopId || undefined,
      code,
      description: description || null,
      discountType,
      discountValue,
      minOrderTotal,
      maxDiscount: maxDiscountRaw ? Number(maxDiscountRaw) : null,
      usageLimit: usageLimitRaw ? Number(usageLimitRaw) : null,
      expiresAt: expiresAtRaw ? new Date(`${expiresAtRaw}T23:59:59`) : null,
    },
  });

  revalidateCoupons();
  return mutationSuccess("Cupom criado com sucesso.");
}

export async function updateCouponAction(
  formData: FormData
): Promise<MutationResult> {
  await requireAdmin();

  const couponId = String(formData.get("couponId") || "");
  const description = String(formData.get("description") || "").trim();
  const discountType = String(formData.get("discountType") || "PERCENT");
  const discountValue = Number(formData.get("discountValue") || 0);
  const minOrderTotal = Number(formData.get("minOrderTotal") || 0);
  const maxDiscountRaw = String(formData.get("maxDiscount") || "").trim();
  const usageLimitRaw = String(formData.get("usageLimit") || "").trim();
  const expiresAtRaw = String(formData.get("expiresAt") || "").trim();

  if (!couponId || discountValue <= 0) {
    return mutationError("Dados do cupom invalidos.");
  }

  await prisma.coupon.update({
    where: { id: couponId },
    data: {
      description: description || null,
      discountType,
      discountValue,
      minOrderTotal,
      maxDiscount: maxDiscountRaw ? Number(maxDiscountRaw) : null,
      usageLimit: usageLimitRaw ? Number(usageLimitRaw) : null,
      expiresAt: expiresAtRaw ? new Date(`${expiresAtRaw}T23:59:59`) : null,
    },
  });

  revalidateCoupons();
  return mutationSuccess("Cupom atualizado com sucesso.");
}

export async function toggleCouponAction(
  formData: FormData
): Promise<MutationResult> {
  await requireAdmin();

  const couponId = String(formData.get("couponId") || "");
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
  });

  if (!coupon) {
    return mutationError("Cupom nao encontrado.");
  }

  await prisma.coupon.update({
    where: { id: couponId },
    data: {
      isActive: !coupon.isActive,
    },
  });

  revalidateCoupons();
  return mutationSuccess(coupon.isActive ? "Cupom desativado." : "Cupom ativado.");
}

export async function deleteCouponAction(
  formData: FormData
): Promise<MutationResult> {
  await requireAdmin();

  const couponId = String(formData.get("couponId") || "");

  if (!couponId) {
    return mutationError("Cupom invalido.");
  }

  await prisma.coupon.delete({
    where: { id: couponId },
  });

  revalidateCoupons();
  return mutationSuccess("Cupom excluido com sucesso.");
}
