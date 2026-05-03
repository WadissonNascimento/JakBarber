import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function redirectToAdminLogin(request: NextRequest, message: string) {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("error", message);

  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "").trim();

  if (!email || !password) {
    return redirectToAdminLogin(request, "Preencha e-mail e senha.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    return redirectToAdminLogin(request, "Administrador nao encontrado.");
  }

  if (!user.isActive) {
    return redirectToAdminLogin(request, "Este usuario esta inativo.");
  }

  if (user.role !== "ADMIN") {
    return redirectToAdminLogin(
      request,
      "Este acesso e exclusivo para administradores."
    );
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    return redirectToAdminLogin(request, "Senha invalida.");
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return redirectToAdminLogin(
        request,
        "Nao foi possivel entrar no painel admin."
      );
    }

    throw error;
  }

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
