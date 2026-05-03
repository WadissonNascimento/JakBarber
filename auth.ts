import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";
import { enforceRateLimit, logSecurityEvent } from "@/lib/security";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      name: "credentials",

      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },

      async authorize(credentials) {
        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password || "");

        if (!email || !password) return null;

        const rateLimit = await enforceRateLimit({
          scope: "auth:credentials",
          identifier: email,
          limit: 8,
          windowMs: 15 * 60 * 1000,
        });

        if (!rateLimit.allowed) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.isActive || !user.passwordHash) {
          logSecurityEvent("login_failed", {
            reason: "user_not_found_or_inactive",
            email,
          });
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatch) {
          logSecurityEvent("login_failed", {
            reason: "bad_password",
            userId: user.id,
          });
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.isActive,
          shopId: user.shopId,
        };
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
});
