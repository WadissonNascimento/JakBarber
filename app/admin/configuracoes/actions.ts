"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clearShopRuntimeCache } from "@/lib/shop";
import { sanitizeEmailInput, sanitizeTextInput } from "@/lib/inputSanitization";
import {
  isValidBrazilianPhone,
  normalizeBrazilianPhoneForSubmit,
} from "@/lib/phone";

type ActionResult = {
  ok: boolean;
  message: string;
  tone: "success" | "error" | "info";
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

async function requireAdminShop() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Nao autorizado.");
  }

  if (!session.user.shopId) {
    throw new Error("Barbearia do administrador nao encontrada.");
  }

  return {
    shopId: session.user.shopId,
  };
}

function normalizeOptionalText(
  formData: FormData,
  key: string,
  maxLength: number
) {
  const value = sanitizeTextInput(formData.get(key)?.toString(), { maxLength });
  return value || null;
}

function normalizeOptionalEmail(formData: FormData, key: string) {
  const value = sanitizeEmailInput(formData.get(key)?.toString());

  if (!value) {
    return null;
  }

  if (!EMAIL_PATTERN.test(value)) {
    throw new Error("Informe um e-mail valido.");
  }

  return value;
}

function normalizeInstagram(value: string | null | undefined) {
  const cleaned = sanitizeTextInput(value, { maxLength: 160 });

  if (!cleaned) {
    return null;
  }

  if (cleaned.startsWith("@")) {
    const handle = cleaned.slice(1).replace(/[^a-zA-Z0-9._]/g, "");
    return handle ? `https://instagram.com/${handle}` : null;
  }

  if (!cleaned.includes("/") && !cleaned.includes(".")) {
    const handle = cleaned.replace(/[^a-zA-Z0-9._]/g, "");
    return handle ? `https://instagram.com/${handle}` : null;
  }

  try {
    const url = new URL(cleaned.startsWith("http") ? cleaned : `https://${cleaned}`);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Protocolo invalido.");
    }

    return url.toString();
  } catch {
    throw new Error("Informe um Instagram valido, como @perfil ou link completo.");
  }
}

function normalizeOptionalColor(formData: FormData, key: string) {
  const value = sanitizeTextInput(formData.get(key)?.toString(), { maxLength: 7 });

  if (!value) {
    return null;
  }

  if (!HEX_COLOR_PATTERN.test(value)) {
    throw new Error("Use cores no formato #RRGGBB.");
  }

  return value.toUpperCase();
}

function hexToMutedColor(hex: string | null) {
  if (!hex || !HEX_COLOR_PATTERN.test(hex)) {
    return null;
  }

  const value = hex.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, 0.18)`;
}

function revalidateShopSettingsViews() {
  revalidatePath("/");
  revalidatePath("/agendar");
  revalidatePath("/produtos");
  revalidatePath("/admin");
  revalidatePath("/admin/configuracoes");
}

export async function updateAdminShopSettingsAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const admin = await requireAdminShop();
    const name = normalizeOptionalText(formData, "name", 80);
    const rawWhatsapp = formData.get("whatsappNumber")?.toString() || "";
    const whatsappNumber = rawWhatsapp.trim()
      ? normalizeBrazilianPhoneForSubmit(rawWhatsapp)
      : null;
    const instagramUrl = normalizeInstagram(
      formData.get("instagramUrl")?.toString()
    );
    const addressLine = normalizeOptionalText(formData, "addressLine", 180);
    const businessHours = normalizeOptionalText(formData, "businessHours", 120);
    const metadataTitle = normalizeOptionalText(formData, "metadataTitle", 80);
    const metadataDescription = normalizeOptionalText(
      formData,
      "metadataDescription",
      180
    );
    const brandColor = normalizeOptionalColor(formData, "brandColor");
    const brandColorStrong = normalizeOptionalColor(formData, "brandColorStrong");
    const emailFromName = normalizeOptionalText(formData, "emailFromName", 80);
    const replyToEmail = normalizeOptionalEmail(formData, "replyToEmail");

    if (!name || name.length < 2) {
      return {
        ok: false,
        tone: "error",
        message: "Informe o nome publico da barbearia.",
      };
    }

    if (rawWhatsapp.trim() && !isValidBrazilianPhone(whatsappNumber)) {
      return {
        ok: false,
        tone: "error",
        message: "Informe um WhatsApp valido no formato (11) 96590-0713.",
      };
    }

    await prisma.$transaction([
      prisma.shop.update({
        where: {
          id: admin.shopId,
        },
        data: {
          name,
          whatsappNumber,
          instagramUrl,
          addressLine,
          businessHours,
          metadataTitle,
          metadataDescription,
          brandColor,
          brandColorStrong,
          brandColorMuted: hexToMutedColor(brandColor),
        },
      }),
      prisma.shopEmailSettings.upsert({
        where: {
          shopId: admin.shopId,
        },
        create: {
          shopId: admin.shopId,
          fromName: emailFromName || name,
          replyToEmail,
        },
        update: {
          fromName: emailFromName || name,
          replyToEmail,
        },
      }),
    ]);

    clearShopRuntimeCache();
    revalidateShopSettingsViews();

    return {
      ok: true,
      tone: "success",
      message: "Configuracoes da barbearia atualizadas.",
    };
  } catch (error) {
    return {
      ok: false,
      tone: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar as configuracoes.",
    };
  }
}
