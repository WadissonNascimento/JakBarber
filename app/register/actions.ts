"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  isUsingDevelopmentMailFallback,
  sendVerificationCodeEmail,
} from "@/lib/mail";
import type { FormFeedbackState } from "@/lib/formFeedbackState";
import { enforceRateLimit, logSecurityEvent } from "@/lib/security";
import { getConfiguredAppUrl } from "@/lib/appUrl";
import { getCurrentShopId } from "@/lib/shop";
import {
  isStrongPassword,
  PASSWORD_REQUIREMENT_MESSAGE,
} from "@/lib/passwordPolicy";

function generateVerificationCode() {
  return randomInt(100000, 1000000).toString();
}

function getExpirationDate() {
  return new Date(Date.now() + 10 * 60 * 1000);
}

const MAX_CODE_ATTEMPTS = 5;

function buildPendingRegistrationRedirect(email: string, code?: string) {
  const devCodeQuery =
    code && isUsingDevelopmentMailFallback()
      ? `&devCode=${encodeURIComponent(code)}`
      : "";

  return `/register/verify?email=${encodeURIComponent(email)}&sent=1${devCodeQuery}`;
}

function buildVerificationUrl(email: string) {
  return `${getConfiguredAppUrl()}/register/verify?email=${encodeURIComponent(email)}`;
}

export async function registerCustomerAction(
  _prevState: FormFeedbackState,
  formData: FormData
): Promise<FormFeedbackState> {
  const shopId = await getCurrentShopId();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (!name || !email || !phone || !password) {
    return {
      error: "Nome, e-mail, telefone e senha sao obrigatorios.",
      success: null,
    };
  }

  const rateLimit = await enforceRateLimit({
    scope: "register:start",
    identifier: email,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: "Muitas tentativas de cadastro. Aguarde e tente novamente.",
      success: null,
    };
  }

  if (!isStrongPassword(password)) {
    return {
      error: PASSWORD_REQUIREMENT_MESSAGE,
      success: null,
    };
  }

  const existingUser = await prisma.user.findFirst({
    where: { email },
  });

  if (existingUser) {
    return {
      error: "Ja existe uma conta com esse e-mail.",
      success: null,
    };
  }

  const existingPendingRegistration = await prisma.pendingRegistration.findFirst({
    where: { email },
  });

  if (existingPendingRegistration) {
    if (existingPendingRegistration.expiresAt.getTime() < Date.now()) {
      await prisma.pendingRegistration.delete({
        where: { email },
      });
    } else {
      redirect(
        buildPendingRegistrationRedirect(email, existingPendingRegistration.code)
      );
    }
  }

  const code = generateVerificationCode();
  const hashedPassword = await bcrypt.hash(password, 10);
  let pendingCreated = false;

  try {
    await prisma.pendingRegistration.create({
      data: {
        name,
        shopId,
        email,
        phone,
        passwordHash: hashedPassword,
        role: "CUSTOMER",
        code,
        expiresAt: getExpirationDate(),
        attempts: 0,
      },
    });
    pendingCreated = true;

    await sendVerificationCodeEmail({
      to: email,
      name,
      code,
      verifyUrl: buildVerificationUrl(email),
      accountLabel: "seu cadastro",
    });
  } catch (error) {
    if (pendingCreated) {
      await prisma.pendingRegistration.deleteMany({
        where: { email },
      });
    }

    return {
      error: "Nao foi possivel enviar o codigo de verificacao.",
      success: null,
    };
  }

  redirect(buildPendingRegistrationRedirect(email, code));
}

export async function verifyRegistrationCodeAction(
  _prevState: FormFeedbackState,
  formData: FormData
): Promise<FormFeedbackState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const code = String(formData.get("code") || "").trim();

  if (!email || !code) {
    return {
      error: "Informe o e-mail e o codigo de verificacao.",
      success: null,
    };
  }

  const rateLimit = await enforceRateLimit({
    scope: "register:verify",
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

  const pending = await prisma.pendingRegistration.findFirst({
    where: { email },
  });

  if (!pending) {
    return {
      error: "Nao encontramos um cadastro pendente para esse e-mail.",
      success: null,
    };
  }

  if (pending.expiresAt.getTime() < Date.now()) {
    return {
      error: "Esse codigo expirou. Solicite um novo envio.",
      success: null,
    };
  }

  if (pending.attempts >= MAX_CODE_ATTEMPTS) {
    return {
      error: "Muitas tentativas invalidas. Solicite um novo codigo.",
      success: null,
    };
  }

  if (pending.code !== code) {
    logSecurityEvent("registration_code_failed", { email });
    await prisma.pendingRegistration.update({
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

  const existingUser = await prisma.user.findFirst({
    where: { email },
  });

  if (existingUser) {
    await prisma.pendingRegistration.delete({
      where: { email },
    });

    return {
      error: "Ja existe uma conta ativa com esse e-mail.",
      success: null,
    };
  }

  await prisma.$transaction([
    prisma.user.create({
      data: {
        name: pending.name,
        shopId: pending.shopId,
        email: pending.email,
        passwordHash: pending.passwordHash,
        phone: pending.phone,
        role: pending.role,
        isActive: true,
        emailVerified: new Date(),
      },
    }),
    prisma.pendingRegistration.delete({
      where: { email },
    }),
  ]);

  redirect("/login?registered=1");
}

export async function resendRegistrationCodeAction(
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
    scope: "register:resend",
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

  const pending = await prisma.pendingRegistration.findFirst({
    where: { email },
  });

  if (!pending) {
    return {
      error: "Nao encontramos um cadastro pendente para esse e-mail.",
      success: null,
    };
  }

  if (pending.expiresAt.getTime() < Date.now()) {
    return {
      error: "O codigo anterior expirou. Recomece o cadastro para receber um novo.",
      success: null,
    };
  }

  const code = generateVerificationCode();
  const previousCode = pending.code;
  const previousExpiresAt = pending.expiresAt;
  const previousAttempts = pending.attempts;

  try {
    await prisma.pendingRegistration.update({
      where: { email },
      data: {
        code,
        expiresAt: getExpirationDate(),
        attempts: 0,
      },
    });

    await sendVerificationCodeEmail({
      to: email,
      name: pending.name,
      code,
      verifyUrl: buildVerificationUrl(email),
      accountLabel: "seu cadastro",
    });
  } catch (error) {
    await prisma.pendingRegistration.update({
      where: { email },
      data: {
        code: previousCode,
        expiresAt: previousExpiresAt,
        attempts: previousAttempts,
      },
    });

    return {
      error: "Nao foi possivel reenviar o codigo.",
      success: null,
    };
  }

  return {
    error: null,
    success: isUsingDevelopmentMailFallback()
      ? `Codigo de verificacao local: ${code}`
      : "Enviamos um novo codigo para o seu e-mail.",
  };
}
