"use server";

import { auth } from "@/auth";
import {
  mutationError,
  mutationSuccess,
  type MutationResult,
} from "@/lib/mutationResult";
import {
  BRAZILIAN_PHONE_EXAMPLE,
  isValidBrazilianPhone,
  normalizeBrazilianPhoneForSubmit,
} from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security";
import { revalidatePath } from "next/cache";

export async function completeCustomerPhoneAction(
  formData: FormData
): Promise<MutationResult> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return mutationError("Entre como cliente para atualizar o telefone.");
  }

  const rateLimit = await enforceRateLimit({
    scope: "customer:complete_phone",
    identifier: session.user.id,
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return mutationError("Muitas tentativas. Aguarde um pouco e tente novamente.");
  }

  const rawPhone = String(formData.get("phone") || "");
  const phone = normalizeBrazilianPhoneForSubmit(rawPhone);

  if (!rawPhone.trim() || !phone || !isValidBrazilianPhone(phone)) {
    return mutationError(`Use um telefone no formato ${BRAZILIAN_PHONE_EXAMPLE}.`);
  }

  const customer = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      role: "CUSTOMER",
      isActive: true,
    },
    select: {
      id: true,
      phone: true,
    },
  });

  if (!customer) {
    return mutationError("Cliente nao encontrado.");
  }

  if (customer.phone) {
    return mutationSuccess("Telefone ja cadastrado.");
  }

  await prisma.user.update({
    where: {
      id: customer.id,
    },
    data: {
      phone,
    },
  });

  revalidatePath("/");
  revalidatePath("/agendar");
  revalidatePath("/customer/agendamentos");
  revalidatePath("/meu-perfil");

  return mutationSuccess("Telefone salvo com sucesso.");
}
