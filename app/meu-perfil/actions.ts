"use server";

import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import {
  mutationError,
  mutationSuccess,
  type MutationResult,
} from "@/lib/mutationResult";
import { sanitizeEmailInput } from "@/lib/inputSanitization";
import {
  BRAZILIAN_PHONE_EXAMPLE,
  isValidBrazilianPhone,
  normalizeBrazilianPhoneForSubmit,
} from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, logSecurityEvent } from "@/lib/security";

const PASSWORD_REQUIREMENT_MESSAGE =
  "A nova senha deve ter no minimo 7 caracteres, uma letra e um caractere especial.";

function isValidPassword(password: string) {
  return (
    password.length >= 7 &&
    /[A-Za-z]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export async function updateCustomerProfileAction(
  formData: FormData
): Promise<MutationResult> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    throw new Error("Nao autorizado.");
  }

  const name = String(formData.get("name") || "").trim();
  const email = sanitizeEmailInput(formData.get("email")?.toString() || "");
  const rawPhone = formData.get("phone")?.toString() || "";
  const phone = rawPhone.trim()
    ? normalizeBrazilianPhoneForSubmit(rawPhone)
    : "";

  if (!name) {
    return mutationError("Informe seu nome.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return mutationError("Informe um e-mail valido.");
  }

  if (rawPhone.trim() && !isValidBrazilianPhone(phone)) {
    return mutationError(`Use um telefone no formato ${BRAZILIAN_PHONE_EXAMPLE}.`);
  }

  const emailOwner = await prisma.user.findFirst({
    where: {
      email,
      NOT: {
        id: session.user.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (emailOwner) {
    return mutationError("Este e-mail ja esta em uso.");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      email,
      phone: phone || null,
    },
  });

  revalidatePath("/meu-perfil");
  return mutationSuccess("Perfil atualizado com sucesso.");
}

export async function updateCustomerPasswordAction(
  formData: FormData
): Promise<MutationResult> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    throw new Error("Nao autorizado.");
  }

  const rateLimit = await enforceRateLimit({
    scope: "customer_password:update",
    identifier: session.user.id,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return mutationError("Muitas tentativas. Aguarde alguns minutos.");
  }

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return mutationError("Preencha senha atual, nova senha e confirmacao.");
  }

  if (!isValidPassword(newPassword)) {
    return mutationError(PASSWORD_REQUIREMENT_MESSAGE);
  }

  if (newPassword !== confirmPassword) {
    return mutationError("A confirmacao da nova senha nao confere.");
  }

  if (newPassword === currentPassword) {
    return mutationError("A nova senha precisa ser diferente da senha atual.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    return mutationError("Nao foi possivel trocar a senha desta conta.");
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!passwordMatches) {
    logSecurityEvent("customer_password_update_failed", {
      reason: "bad_current_password",
      userId: session.user.id,
    });
    return mutationError("Senha atual invalida.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      passwordHash,
    },
  });

  return mutationSuccess("Senha atualizada com sucesso.");
}
