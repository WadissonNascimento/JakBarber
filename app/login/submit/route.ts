import { AuthError } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { enforceRateLimit, logSecurityEvent } from "@/lib/security";

export const dynamic = "force-dynamic";

function redirectToLogin(request: NextRequest, message: string) {
  const url = new URL("/login", request.url);
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
    return redirectToLogin(request, "Preencha e-mail e senha.");
  }

  const rateLimit = await enforceRateLimit({
    scope: "login:http",
    identifier: email,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return redirectToLogin(
      request,
      "Muitas tentativas de login. Aguarde alguns minutos e tente novamente."
    );
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/painel",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      logSecurityEvent("login_submit_failed", { email });
      return redirectToLogin(request, "E-mail ou senha invalidos.");
    }

    throw error;
  }

  return NextResponse.redirect(new URL("/painel", request.url), 303);
}
