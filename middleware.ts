import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const role = req.auth?.user?.role;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/login/submit" ||
    pathname === "/admin/login" ||
    pathname === "/admin/login/submit" ||
    pathname === "/cadastro" ||
    pathname === "/register" ||
    pathname.startsWith("/register/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/");
  const isPainelRoot = pathname === "/painel";
  const isCustomerProtectedPage =
    pathname.startsWith("/customer") ||
    pathname.startsWith("/agendar") ||
    pathname.startsWith("/meu-perfil") ||
    pathname.startsWith("/meus-pedidos");

  if (
    !isLoggedIn &&
    (pathname.startsWith("/painel") ||
      (pathname.startsWith("/admin") && !isAuthPage) ||
      pathname.startsWith("/barber") ||
      isCustomerProtectedPage)
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isAuthPage) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (role === "BARBER") {
      return NextResponse.redirect(new URL("/barber", req.url));
    }

    return NextResponse.redirect(new URL("/customer", req.url));
  }

  if (isLoggedIn && isPainelRoot) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (role === "BARBER") {
      return NextResponse.redirect(new URL("/barber", req.url));
    }

    return NextResponse.redirect(new URL("/customer", req.url));
  }

  if (pathname.startsWith("/admin") && !isAuthPage && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/painel", req.url));
  }

  if (pathname.startsWith("/barber") && role !== "BARBER") {
    return NextResponse.redirect(new URL("/painel", req.url));
  }

  if (isCustomerProtectedPage && role !== "CUSTOMER") {
    return NextResponse.redirect(new URL("/painel", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/login",
    "/login/:path*",
    "/cadastro",
    "/register",
    "/register/:path*",
    "/forgot-password",
    "/forgot-password/:path*",
    "/painel/:path*",
    "/admin/:path*",
    "/barber/:path*",
    "/customer/:path*",
    "/agendar/:path*",
    "/meu-perfil/:path*",
    "/meus-pedidos/:path*",
  ],
};
