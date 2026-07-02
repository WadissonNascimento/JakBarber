"use server";

import { revalidatePath } from "next/cache";
import { sanitizeTextareaInput } from "@/lib/inputSanitization";
import {
  mutationError,
  mutationSuccess,
  type MutationResult,
} from "@/lib/mutationResult";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security";
import { requireTenantSession, SHOP_ADMIN_ROLES } from "@/lib/tenantSession";

const MAX_ADVANCE_AMOUNT = 100000;

function parseAdvanceAmount(value: FormDataEntryValue | null) {
  const rawValue = String(value || "").trim().replace(/\s+/g, "");

  if (!/^\d{1,6}([,.]\d{1,2})?$/.test(rawValue)) {
    return null;
  }

  const amount = Number(rawValue.replace(",", "."));

  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_ADVANCE_AMOUNT) {
    return null;
  }

  return amount.toFixed(2);
}

export async function createAdminBarberAdvanceAction(
  _previousState: MutationResult | null,
  formData: FormData
): Promise<MutationResult> {
  const { user, shopId } = await requireTenantSession({
    roles: SHOP_ADMIN_ROLES,
  });
  const rateLimit = await enforceRateLimit({
    scope: "admin_advance:create",
    identifier: user.id,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return mutationError("Muitas tentativas. Aguarde um pouco e tente novamente.");
  }

  const barberId = String(formData.get("barberId") || "");
  const amount = parseAdvanceAmount(formData.get("amount"));
  const reason = sanitizeTextareaInput(String(formData.get("reason") || ""), 500);

  if (!barberId) {
    return mutationError("Escolha o barbeiro que vai receber o vale.");
  }

  if (!amount) {
    return mutationError("Informe um valor positivo e valido para o vale.");
  }

  if (!reason) {
    return mutationError("Informe o motivo do vale.");
  }

  const barber = await prisma.user.findFirst({
    where: {
      id: barberId,
      shopId,
      role: "BARBER",
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!barber) {
    return mutationError("Barbeiro nao encontrado ou inativo.");
  }

  await prisma.barberAdvance.create({
    data: {
      shopId,
      barberId: barber.id,
      amount,
      reason,
      advanceDate: new Date(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/vales");
  revalidatePath("/barber");
  revalidatePath("/barber/financeiro");
  revalidatePath("/barber/vales");

  return mutationSuccess("Vale lancado com sucesso na quinzena atual.");
}
