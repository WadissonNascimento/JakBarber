import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createTenantShop,
  TenantProvisioningError,
  type CreateTenantShopInput,
} from "@/lib/tenantProvisioning";
import { deleteTenantBrandAsset, uploadTenantLogo } from "@/lib/tenantBrandAssets";
import { isWrTenantCreationEnabled, requireWrAdminSession } from "@/lib/wrSession";

export const dynamic = "force-dynamic";

type UploadedTenantLogo = {
  assetPath: string;
  assetUrl: string;
};

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

function getIntegerValue(formData: FormData, key: string) {
  const value = getNumberValue(formData, key);
  return value === null ? null : Math.trunc(value);
}

function getOptionalImageFile(formData: FormData, key: string) {
  const file = formData.get(key);

  return file instanceof File && file.size > 0 ? file : null;
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
  const logoFile = getOptionalImageFile(formData, "logoFile");
  let uploadedLogo: UploadedTenantLogo | null = null;
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

  if (logoFile) {
    try {
      uploadedLogo = await uploadTenantLogo(
        logoFile,
        getOptionalString(formData, "slug") || getOptionalString(formData, "name"),
      );
    } catch (error) {
      return errorRedirect(
        request,
        error instanceof Error
          ? error.message
          : "Nao foi possivel processar a logo.",
      );
    }
  }

  try {
    await createTenantShop(
      {
        name: String(formData.get("name") || ""),
        slug: getOptionalString(formData, "slug"),
        primaryDomain: getOptionalString(formData, "domain"),
        logoPath: uploadedLogo?.assetUrl || getOptionalString(formData, "logoPath"),
        faviconPath: getOptionalString(formData, "faviconPath"),
        brandColor: getOptionalString(formData, "brandColor"),
        backgroundColor: getOptionalString(formData, "backgroundColor"),
        textColor: getOptionalString(formData, "textColor"),
        fontStyle: getOptionalString(formData, "fontStyle") as CreateTenantShopInput["fontStyle"],
        designTemplate: getOptionalString(
          formData,
          "designTemplate"
        ) as CreateTenantShopInput["designTemplate"],
        heroImageUrl: getOptionalString(formData, "heroImageUrl"),
        heroEyebrow: getOptionalString(formData, "heroEyebrow"),
        heroTitle: getOptionalString(formData, "heroTitle"),
        heroSubtitle: getOptionalString(formData, "heroSubtitle"),
        primaryCtaLabel: getOptionalString(formData, "primaryCtaLabel"),
        secondaryCtaLabel: getOptionalString(formData, "secondaryCtaLabel"),
        secondaryCtaHref: getOptionalString(formData, "secondaryCtaHref"),
        attendanceText: getOptionalString(formData, "attendanceText"),
        reviewsTitle: getOptionalString(formData, "reviewsTitle"),
        reviewsEmptyText: getOptionalString(formData, "reviewsEmptyText"),
        planCode: getOptionalString(formData, "planCode") as CreateTenantShopInput["planCode"],
        barberLimit: getIntegerValue(formData, "barberLimit"),
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
    if (uploadedLogo) {
      await deleteTenantBrandAsset(uploadedLogo.assetPath);
    }

    if (error instanceof TenantProvisioningError) {
      return errorRedirect(request, error.message);
    }

    throw error;
  }

  revalidatePath("/wr");
  revalidatePath("/wr/tenants");

  return successRedirect(request);
}
