import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";
import { enforceRateLimit, logSecurityEvent } from "@/lib/security";
import { isGoogleSignInConfigured } from "@/lib/googleAuth";
import { verifyRegistrationAutoLoginToken } from "@/lib/registrationAutoLogin";
import { DEFAULT_SHOP_ID, getCurrentShopId } from "@/lib/shop";

const googleSignInConfigured = isGoogleSignInConfigured();

function getGoogleProviders() {
  if (!googleSignInConfigured) {
    return [];
  }

  return [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ];
}

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
    Credentials({
      id: "registration-auto-login",
      name: "registration-auto-login",

      credentials: {
        userId: { label: "User ID", type: "text" },
        token: { label: "Token", type: "text" },
      },

      async authorize(credentials) {
        const userId = String(credentials?.userId || "").trim();
        const token = String(credentials?.token || "").trim();

        if (!userId || !token) return null;

        if (!verifyRegistrationAutoLoginToken(userId, token)) {
          logSecurityEvent("registration_auto_login_failed", { userId });
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user || !user.isActive || user.role !== "CUSTOMER") {
          logSecurityEvent("registration_auto_login_failed", {
            reason: "user_not_allowed",
            userId,
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
    ...getGoogleProviders(),
  ],

  callbacks: {
    ...authConfig.callbacks,

    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email = String(user.email || "").trim().toLowerCase();
      const emailVerified = (profile as { email_verified?: boolean } | undefined)
        ?.email_verified;

      if (!email || emailVerified === false) {
        logSecurityEvent("google_login_failed", {
          reason: "email_not_verified",
          email,
        });
        return false;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        if (!existingUser.isActive) {
          logSecurityEvent("google_login_failed", {
            reason: "inactive_user",
            userId: existingUser.id,
          });
          return false;
        }

        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            emailVerified: existingUser.emailVerified || new Date(),
            image: existingUser.image || user.image,
          },
        });

        return true;
      }

      const shopId = await getCurrentShopId().catch(() => DEFAULT_SHOP_ID);

      await prisma.user.create({
        data: {
          shopId,
          name: user.name || email.split("@")[0],
          email,
          image: user.image,
          role: "CUSTOMER",
          isActive: true,
          emailVerified: new Date(),
        },
      });

      return true;
    },

    async jwt(params) {
      const token = authConfig.callbacks?.jwt
        ? await authConfig.callbacks.jwt(params)
        : params.token;

      if (params.account?.provider === "google" && params.user?.email) {
        const email = String(params.user.email).trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (user) {
          token.id = user.id;
          token.role = user.role;
          token.active = user.isActive;
          token.shopId = user.shopId;
        }
      }

      return token;
    },
  },

  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
});
