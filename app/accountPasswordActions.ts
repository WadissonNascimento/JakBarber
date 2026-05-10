"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import {
  mutationError,
  mutationSuccess,
  type MutationResult,
} from "@/lib/mutationResult";
import {
  isStrongPassword,
  NEW_PASSWORD_REQUIREMENT_MESSAGE,
} from "@/lib/passwordPolicy";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, logSecurityEvent } from "@/lib/security";

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
