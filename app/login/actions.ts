"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import type { FormFeedbackState } from "@/lib/formFeedbackState";
import { enforceRateLimit, logSecurityEvent } from "@/lib/security";

export async function loginAction(
  _prevState: FormFeedbackState,
  formData: FormData
): Promise<FormFeedbackState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "").trim();

  if (!email || !password) {
    return { error: "Preencha e-mail e senha.", success: null };
  }

  const rateLimit = await enforceRateLimit({
    scope: "login:action",
    identifier: email,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
      success: null,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      logSecurityEvent("login_action_failed", { email });
      return { error: "E-mail ou senha invalidos.", success: null };
    }

    throw error;
  }

  redirect("/painel");
}
