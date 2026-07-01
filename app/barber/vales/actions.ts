"use server";

import { revalidatePath } from "next/cache";
import { requireActiveBarber } from "@/app/barber/guard";
import {
  mutationError,
  mutationSuccess,
  type MutationResult,
} from "@/lib/mutationResult";
import { prisma } from "@/lib/prisma";
import { sanitizeTextareaInput } from "@/lib/inputSanitization";
import { enforceRateLimit } from "@/lib/security";

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

export async function createBarberAdvanceAction(
  _previousState: MutationResult | null,
  formData: FormData
): Promise<MutationResult> {
  const { session, barber } = await requireActiveBarber();
  const rateLimit = await enforceRateLimit({
    scope: "barber_advance:create",
    identifier: session.user.id,
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return mutationError("Muitas tentativas. Aguarde um pouco e tente novamente.");
  }

  const amount = parseAdvanceAmount(formData.get("amount"));
  const reason = sanitizeTextareaInput(String(formData.get("reason") || ""), 500);

  if (!amount) {
    return mutationError("Informe um valor positivo e valido para o vale.");
  }

  if (!reason) {
    return mutationError("Informe o motivo do vale.");
  }

  await prisma.barberAdvance.create({
    data: {
      shopId: barber.shopId,
      barberId: barber.id,
      amount,
      reason,
      advanceDate: new Date(),
    },
  });

  revalidatePath("/barber");
  revalidatePath("/barber/vales");
  revalidatePath("/barber/financeiro");
  revalidatePath("/admin");
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/vales");

  return mutationSuccess("Vale anotado com sucesso.");
}
