import type { MetadataRoute } from "next";
import { DEFAULT_SHOP_ID, getCurrentShop } from "@/lib/shop";
import {
  JAKBARBER_APP_NAME,
  JAKBARBER_BACKGROUND_COLOR,
  JAKBARBER_ICON_192_PATH,
  JAKBARBER_ICON_512_PATH,
  JAKBARBER_MASKABLE_ICON_512_PATH,
  JAKBARBER_THEME_COLOR,
} from "@/lib/pwaAssets";
import {
  WR_TECH_LOGO_PATH,
  WR_TECH_SITE_URL,
} from "@/lib/wrTechInstitutional";
import { isWrTechInstitutionalRequest } from "@/lib/wrTechInstitutionalServer";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  if (await isWrTechInstitutionalRequest()) {
    return {
      name: "WR Tech Solutions",
      short_name: "WR Tech",
      description: "Sistema SaaS para barbearias.",
      id: WR_TECH_SITE_URL,
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#05070b",
      theme_color: "#05070b",
      icons: [
        {
          src: WR_TECH_LOGO_PATH,
          sizes: "512x512",
          type: "image/png",
        },
      ],
    };
  }

  const shop = await getCurrentShop();
  const isJakBarber = shop.id === DEFAULT_SHOP_ID;
  const appName = isJakBarber ? JAKBARBER_APP_NAME : shop.name || "Barbearia";
  const iconPath = shop.faviconPath || shop.logoPath || "/favicon.png";

  return {
    name: appName,
    short_name: appName,
    description:
      shop.metadataDescription ||
      "Agende horarios, acompanhe seus atendimentos e veja maquinas da barbearia.",
    id: shop.primaryDomain ? `https://${shop.primaryDomain}/` : "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: isJakBarber
      ? JAKBARBER_BACKGROUND_COLOR
      : shop.brandColorMuted || "#05070b",
    theme_color: isJakBarber
      ? JAKBARBER_THEME_COLOR
      : shop.brandColor || "#05070b",
    icons: isJakBarber
      ? [
          {
            src: JAKBARBER_ICON_192_PATH,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: JAKBARBER_ICON_512_PATH,
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: JAKBARBER_MASKABLE_ICON_512_PATH,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ]
      : [
          {
            src: iconPath,
            sizes: "512x512",
            type: "image/png",
          },
        ],
  };
}
