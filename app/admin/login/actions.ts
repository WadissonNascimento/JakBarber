"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { FormFeedbackState } from "@/lib/formFeedbackState";

export async function adminLoginAction(
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

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    return { error: "Administrador nao encontrado.", success: null };
  }

  if (!user.isActive) {
    return { error: "Este usuario esta inativo.", success: null };
  }

  if (user.role !== "ADMIN") {
    return { error: "Este acesso e exclusivo para administradores.", success: null };
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    return { error: "Senha invalida.", success: null };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Nao foi possivel entrar no painel admin.", success: null };
    }

    throw error;
  }

  redirect("/admin");
}
