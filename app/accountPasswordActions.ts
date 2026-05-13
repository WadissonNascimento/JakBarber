"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  mutationError,
  mutationSuccess,
  type MutationResult,
} from "@/lib/mutationResult";
import { sanitizeEmailInput } from "@/lib/inputSanitization";
import {
  isStrongPassword,
  NEW_PASSWORD_REQUIREMENT_MESSAGE,
} from "@/lib/passwordPolicy";
import {
  BRAZILIAN_PHONE_EXAMPLE,
  isValidBrazilianPhone,
  normalizeBrazilianPhoneForSubmit,
} from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, logSecurityEvent } from "@/lib/security";

export async function updateOwnAdminContactAction(
  formData: FormData
): Promise<MutationResult> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Nao autorizado.");
  }

  const rateLimit = await enforceRateLimit({
    scope: "admin_contact:update",
    identifier: session.user.id,
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return mutationError("Muitas alteracoes em pouco tempo. Aguarde e tente novamente.");
  }

  const name = String(formData.get("name") || "").trim().replace(/\s+/g, " ");
  const email = sanitizeEmailInput(formData.get("email")?.toString() || "");
  const rawPhone = formData.get("phone")?.toString() || "";
  const phone = rawPhone.trim()
    ? normalizeBrazilianPhoneForSubmit(rawPhone)
    : "";

  if (name.length < 2 || name.length > 80) {
    return mutationError("Informe um nome valido.");
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
    where: {
      id: session.user.id,
    },
    data: {
      name,
      email,
      phone: phone || null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/barber");
  revalidatePath("/admin/barbeiros");

  return mutationSuccess("Dados atualizados com sucesso.");
}

export async function updateOwnAccountPasswordAction(
  formData: FormData
): Promise<MutationResult> {
  const session = await auth();

  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "BARBER")
  ) {
    throw new Error("Nao autorizado.");
  }

  const rateLimit = await enforceRateLimit({
    scope: `${session.user.role.toLowerCase()}_password:update`,
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

  if (!isStrongPassword(newPassword)) {
    return mutationError(NEW_PASSWORD_REQUIREMENT_MESSAGE);
  }

  if (newPassword !== confirmPassword) {
    return mutationError("A confirmacao da nova senha nao confere.");
  }

  if (newPassword === currentPassword) {
    return mutationError("A nova senha precisa ser diferente da senha atual.");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      role: session.user.role,
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
    logSecurityEvent("staff_password_update_failed", {
      reason: "bad_current_password",
      userId: session.user.id,
      role: session.user.role,
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

  logSecurityEvent("staff_password_updated", {
    userId: session.user.id,
    role: session.user.role,
  });

  return mutationSuccess("Senha atualizada com sucesso.");
}
