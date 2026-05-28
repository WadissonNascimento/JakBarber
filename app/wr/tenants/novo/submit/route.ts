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

function getBooleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
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
        metadataTitle: getOptionalString(formData, "metadataTitle"),
        metadataDescription: getOptionalString(formData, "metadataDescription"),
        whatsappNumber: getOptionalString(formData, "whatsappNumber"),
        instagramUrl: getOptionalString(formData, "instagramUrl"),
        addressLine: getOptionalString(formData, "addressLine"),
        businessHours: getOptionalString(formData, "businessHours"),
        logoPath: getOptionalString(formData, "logoPath"),
        brandColor: getOptionalString(formData, "brandColor"),
        homeContent: {
          heroEyebrow: getOptionalString(formData, "heroEyebrow"),
          heroTitle: getOptionalString(formData, "heroTitle"),
          heroSubtitle: getOptionalString(formData, "heroSubtitle"),
          primaryButtonLabel: getOptionalString(formData, "primaryButtonLabel"),
          primaryButtonHref: getOptionalString(formData, "primaryButtonHref"),
          secondaryButtonLabel: getOptionalString(formData, "secondaryButtonLabel"),
          secondaryButtonHref: getOptionalString(formData, "secondaryButtonHref"),
          infoOneLabel: getOptionalString(formData, "infoOneLabel"),
          infoOneValue: getOptionalString(formData, "infoOneValue"),
          infoTwoLabel: getOptionalString(formData, "infoTwoLabel"),
          infoTwoValue: getOptionalString(formData, "infoTwoValue"),
          infoThreeLabel: getOptionalString(formData, "infoThreeLabel"),
          infoThreeValue: getOptionalString(formData, "infoThreeValue"),
          showServices: getBooleanValue(formData, "showServices"),
          servicesEyebrow: getOptionalString(formData, "servicesEyebrow"),
          servicesTitle: getOptionalString(formData, "servicesTitle"),
          servicesDescription: getOptionalString(formData, "servicesDescription"),
          showBarbers: getBooleanValue(formData, "showBarbers"),
          barbersEyebrow: getOptionalString(formData, "barbersEyebrow"),
          barbersTitle: getOptionalString(formData, "barbersTitle"),
          barbersDescription: getOptionalString(formData, "barbersDescription"),
          showProducts: getBooleanValue(formData, "showProducts"),
          productsEyebrow: getOptionalString(formData, "productsEyebrow"),
          productsTitle: getOptionalString(formData, "productsTitle"),
          productsDescription: getOptionalString(formData, "productsDescription"),
          showReviews: getBooleanValue(formData, "showReviews"),
          reviewsEyebrow: getOptionalString(formData, "reviewsEyebrow"),
          reviewsTitle: getOptionalString(formData, "reviewsTitle"),
          reviewsEmptyText: getOptionalString(formData, "reviewsEmptyText"),
          showAbout: getBooleanValue(formData, "showAbout"),
          aboutEyebrow: getOptionalString(formData, "aboutEyebrow"),
          aboutTitle: getOptionalString(formData, "aboutTitle"),
          aboutBody: getOptionalString(formData, "aboutBody"),
          showContact: getBooleanValue(formData, "showContact"),
          contactEyebrow: getOptionalString(formData, "contactEyebrow"),
          contactTitle: getOptionalString(formData, "contactTitle"),
          contactBody: getOptionalString(formData, "contactBody"),
          footerText: getOptionalString(formData, "footerText"),
        },
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
