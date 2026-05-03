import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function wantsJson(request: NextRequest) {
  return (
    request.headers.get("accept")?.includes("application/json") ||
    request.headers.get("x-requested-with") === "fetch"
  );
}

function adminLoginErrorUrl(request: NextRequest, message: string) {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("error", message);

  return url;
}

function adminLoginError(request: NextRequest, message: string) {
  const url = adminLoginErrorUrl(request, message);

  if (wantsJson(request)) {
    return NextResponse.json(
      { ok: false, error: message, redirectTo: `${url.pathname}${url.search}` },
      { status: 401 }
    );
  }

  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "").trim();

  if (!email || !password) {
    return adminLoginError(request, "Preencha e-mail e senha.");
  }

  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    return adminLoginError(request, "Administrador nao encontrado.");
  }

  if (!user.isActive) {
    return adminLoginError(request, "Este usuario esta inativo.");
  }

  if (user.role !== "ADMIN") {
    return adminLoginError(
      request,
      "Este acesso e exclusivo para administradores."
    );
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    return adminLoginError(request, "Senha invalida.");
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
      return adminLoginError(
        request,
        "Nao foi possivel entrar no painel admin."
      );
    }

    throw error;
  }

  if (wantsJson(request)) {
    return NextResponse.json({ ok: true, redirectTo: "/admin" });
  }

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
