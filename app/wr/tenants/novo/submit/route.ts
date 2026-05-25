import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createTenantShop,
  TenantProvisioningError,
  type CreateTenantShopInput,
} from "@/lib/tenantProvisioning";
import { isWrTenantCreationEnabled, requireWrAdminSession } from "@/lib/wrSession";

export const dynamic = "force-dynamic";

function wantsJson(request: NextRequest) {
  return request.headers.get("x-wr-fetch") === "1";
}

function errorRedirect(request: NextRequest, message: string) {
  if (wantsJson(request)) {
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const url = new URL("/wr/tenants/novo", request.url);
  url.searchParams.set("error", message);

  return NextResponse.redirect(url, 303);
}

function successRedirect(request: NextRequest) {
  if (wantsJson(request)) {
    return NextResponse.json({ ok: true, redirectTo: "/wr/tenants" });
  }

  return NextResponse.redirect(new URL("/wr/tenants", request.url), 303);
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim();
  return value || null;
}

function getNumberValue(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim();
  return value ? Number(value) : null;
}

export async function POST(request: NextRequest) {
  const [{ user }, creationEnabled, formData] = await Promise.all([
    requireWrAdminSession(),
    isWrTenantCreationEnabled(),
    request.formData(),
  ]);

  if (!creationEnabled) {
    return errorRedirect(request, "Criacao bloqueada neste ambiente.");
  }

  const serviceName = getOptionalString(formData, "serviceName");
  const servicePrice = getNumberValue(formData, "servicePrice");
  const serviceDuration = getNumberValue(formData, "serviceDuration");
  const defaultServices: CreateTenantShopInput["defaultServices"] = serviceName
    ? [
        {
          name: serviceName,
          price: servicePrice ?? 45,
          duration: serviceDuration ?? 40,
          commissionType: "PERCENT",
          commissionValue: 40,
        },
      ]
    : [];

  try {
    await createTenantShop(
      {
        name: String(formData.get("name") || ""),
        slug: getOptionalString(formData, "slug"),
        primaryDomain: getOptionalString(formData, "domain"),
        logoPath: getOptionalString(formData, "logoPath"),
        brandColor: getOptionalString(formData, "brandColor"),
        admin: {
          name: String(formData.get("adminName") || ""),
          email: String(formData.get("adminEmail") || ""),
          password: String(formData.get("adminPassword") || ""),
        },
        defaultServices,
      },
      user.id
    );
  } catch (error) {
    if (error instanceof TenantProvisioningError) {
      return errorRedirect(request, error.message);
    }

    throw error;
  }

  revalidatePath("/wr");
  revalidatePath("/wr/tenants");

  return successRedirect(request);
}
