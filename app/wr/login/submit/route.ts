import { AuthError } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { normalizeIdentityEmail } from "@/lib/userIdentity";

export const dynamic = "force-dynamic";

function wrLoginError(request: NextRequest, message: string) {
  const url = new URL("/wr/login", request.url);
  url.searchParams.set("error", message);

  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = normalizeIdentityEmail(formData.get("email")?.toString());
  const password = String(formData.get("password") || "").trim();

  if (!email || !password) {
    return wrLoginError(request, "Preencha e-mail e senha.");
  }

  try {
    await signIn("credentials", {
      email,
      password,
      wrLogin: "1",
      redirect: false,
      redirectTo: "/wr",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return wrLoginError(request, "Acesso WR nao autorizado.");
    }

    throw error;
  }

  return NextResponse.redirect(new URL("/wr", request.url), 303);
}
