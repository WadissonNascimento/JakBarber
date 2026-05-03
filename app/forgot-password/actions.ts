"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import type { FormFeedbackState } from "@/lib/formFeedbackState";
import {
  isUsingDevelopmentMailFallback,
  sendPasswordResetCodeEmail,
} from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, logSecurityEvent } from "@/lib/security";
import { getCurrentShopId } from "@/lib/shop";

function generateCode() {
  return randomInt(100000, 1000000).toString();
}

function getExpirationDate() {
  return new Date(Date.now() + 10 * 60 * 1000);
}

const MAX_RESET_ATTEMPTS = 5;

export async function requestPasswordResetAction(
  _prevState: FormFeedbackState,
  formData: FormData
): Promise<FormFeedbackState> {
  const shopId = await getCurrentShopId();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return {
      error: "Informe o e-mail da sua conta.",
      success: null,
    };
  }

  const rateLimit = await enforceRateLimit({
    scope: "password_reset:start",
    identifier: email,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: "Muitas solicitacoes de recuperacao. Aguarde e tente novamente.",
      success: null,
    };
  }

  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    const pendingRegistration = await prisma.pendingRegistration.findFirst({
      where: { email },
    });

    if (pendingRegistration) {
      return {
        error:
          "Esse e-mail ainda esta com cadastro pendente. Volte para a tela de cadastro e finalize a verificacao do codigo.",
        success: null,
      };
    }

    return {
      error:
        "Se existir uma conta ativa com esse e-mail, enviaremos um codigo de recuperacao.",
      success: null,
    };
  }

  const code = generateCode();

  try {
    await prisma.passwordResetRequest.upsert({
      where: { email },
      update: {
        code,
        expiresAt: getExpirationDate(),
        attempts: 0,
      },
      create: {
        shopId,
        email,
        code,
        expiresAt: getExpirationDate(),
      },
    });

    await sendPasswordResetCodeEmail({
      to: email,
      name: user.name || "cliente",
      code,
    });
  } catch (error) {
    return {
      error: "Nao foi possivel enviar o codigo de recuperacao.",
      success: null,
    };
  }

  const devCode = isUsingDevelopmentMailFallback()
    ? `&devCode=${encodeURIComponent(code)}`
    : "";

  redirect(`/forgot-password/reset?email=${encodeURIComponent(email)}&sent=1${devCode}`);
}

export async function resendPasswordResetCodeAction(
  _prevState: FormFeedbackState,
  formData: FormData
): Promise<FormFeedbackState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return {
      error: "Informe o e-mail para reenviar o codigo.",
      success: null,
    };
  }

  const rateLimit = await enforceRateLimit({
    scope: "password_reset:resend",
    identifier: email,
    limit: 3,
    windowMs: 30 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: "Muitos reenvios solicitados. Aguarde e tente novamente.",
      success: null,
    };
  }

  const [resetRequest, user] = await Promise.all([
    prisma.passwordResetRequest.findFirst({
      where: { email },
    }),
    prisma.user.findFirst({
      where: { email },
    }),
  ]);

  if (!resetRequest || !user) {
    return {
      error: "Nao encontramos uma solicitacao de recuperacao para esse e-mail.",
      success: null,
    };
  }

  const code = generateCode();

  try {
    await prisma.passwordResetRequest.update({
      where: { email },
      data: {
        code,
        expiresAt: getExpirationDate(),
        attempts: 0,
      },
    });

    await sendPasswordResetCodeEmail({
      to: email,
      name: user.name || "cliente",
      code,
    });
  } catch (error) {
    return {
      error: "Nao foi possivel reenviar o codigo.",
      success: null,
    };
  }

  return {
    error: null,
    success: isUsingDevelopmentMailFallback()
      ? `Codigo de recuperacao local: ${code}`
      : "Enviamos um novo codigo de recuperacao para o seu e-mail.",
  };
}

export async function resetPasswordWithCodeAction(
  _prevState: FormFeedbackState,
  formData: FormData
): Promise<FormFeedbackState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const code = String(formData.get("code") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const confirmPassword = String(formData.get("confirmPassword") || "").trim();

  if (!email || !code || !password || !confirmPassword) {
    return {
      error: "Preencha e-mail, codigo e nova senha.",
      success: null,
    };
  }

  const rateLimit = await enforceRateLimit({
    scope: "password_reset:verify",
    identifier: email,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: "Muitas tentativas de verificacao. Aguarde e tente novamente.",
      success: null,
    };
  }

  if (password.length < 6) {
    return {
      error: "A nova senha deve ter pelo menos 6 caracteres.",
      success: null,
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "As senhas informadas nao conferem.",
      success: null,
    };
  }

  const resetRequest = await prisma.passwordResetRequest.findFirst({
    where: { email },
  });

  if (!resetRequest) {
    return {
      error: "Nao encontramos uma solicitacao de recuperacao para esse e-mail.",
      success: null,
    };
  }

  if (resetRequest.expiresAt.getTime() < Date.now()) {
    return {
      error: "Esse codigo expirou. Solicite um novo envio.",
      success: null,
    };
  }

  if (resetRequest.attempts >= MAX_RESET_ATTEMPTS) {
    return {
      error: "Muitas tentativas invalidas. Solicite um novo codigo.",
      success: null,
    };
  }

  if (resetRequest.code !== code) {
    logSecurityEvent("password_reset_code_failed", { email });
    await prisma.passwordResetRequest.update({
      where: { email },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    return {
      error: "Codigo invalido. Confira o e-mail e tente novamente.",
      success: null,
    };
  }

  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    await prisma.passwordResetRequest.delete({
      where: { email },
    });

    return {
      error: "Nao encontramos uma conta ativa com esse e-mail.",
      success: null,
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: {
        passwordHash,
      },
    }),
    prisma.passwordResetRequest.delete({
      where: { email },
    }),
  ]);

  redirect("/login?reset=1");
}
