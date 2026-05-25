import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  activateCustomDomainFromPanel,
  DomainActivationError,
} from "@/lib/domainActivation";
import { basePrisma } from "@/lib/prisma-core";
import { requireWrAdminSession } from "@/lib/wrSession";

export const dynamic = "force-dynamic";

function redirectToTenants(request: NextRequest, type: "notice" | "error", message: string) {
  const url = new URL("/wr/tenants", request.url);
  url.searchParams.set(type, message);

  return NextResponse.redirect(url, 303);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ shopId: string }> },
) {
  const [{ shopId }] = await Promise.all([context.params, requireWrAdminSession()]);

  const shop = await basePrisma.shop.findFirst({
    where: {
      id: shopId,
      isActive: true,
    },
    select: {
      name: true,
      primaryDomain: true,
    },
  });

  if (!shop?.primaryDomain) {
    return redirectToTenants(request, "error", "Barbearia sem dominio ativo.");
  }

  try {
    await activateCustomDomainFromPanel(shop.primaryDomain);
  } catch (error) {
    if (error instanceof DomainActivationError) {
      return redirectToTenants(request, "error", error.message);
    }

    throw error;
  }

  revalidatePath("/wr");
  revalidatePath("/wr/tenants");

  return redirectToTenants(request, "notice", `SSL ativado para ${shop.name}.`);
}
