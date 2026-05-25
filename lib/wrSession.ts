import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isWrTechAppRequest } from "@/lib/wrTechInstitutionalServer";

export const WR_ADMIN_ROLES = ["WR_ADMIN"] as const;

export async function isWrTenantCreationEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.WR_TENANT_CREATION_ENABLED === "1"
  );
}

export async function requireWrAdminSession() {
  const [session, isWrHost] = await Promise.all([
    auth(),
    isWrTechAppRequest().catch(() => false),
  ]);

  if (!isWrHost && process.env.NODE_ENV === "production") {
    redirect("/");
  }

  if (!session?.user?.id) {
    redirect("/wr/login");
  }

  if (!WR_ADMIN_ROLES.includes(session.user.role as "WR_ADMIN")) {
    redirect("/logout");
  }

  return {
    session,
    user: session.user,
  };
}
