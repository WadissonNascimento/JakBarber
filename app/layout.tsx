import "./globals.css";
import AppChrome from "@/components/AppChrome";
import ClientRuntimeGuard from "@/components/ClientRuntimeGuard";
import RequiredCustomerPhoneModal from "@/components/RequiredCustomerPhoneModal";
import { Manrope, Space_Grotesk } from "next/font/google";
import { auth } from "@/auth";
import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { getConfiguredAppUrl } from "@/lib/appUrl";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SHOP_ID, getCurrentShop } from "@/lib/shop";
import {
  JAKBARBER_APP_NAME,
  JAKBARBER_APPLE_TOUCH_ICON_PATH,
  JAKBARBER_BACKGROUND_COLOR,
  JAKBARBER_FAVICON_32_PATH,
  JAKBARBER_FAVICON_48_PATH,
  JAKBARBER_ICON_192_PATH,
  JAKBARBER_STARTUP_IMAGES,
  JAKBARBER_THEME_COLOR,
} from "@/lib/pwaAssets";
import {
  WR_TECH_APP_URL,
  WR_TECH_LOGO_PATH,
  WR_TECH_SITE_URL,
} from "@/lib/wrTechInstitutional";
import {
  isWrTechAppRequest,
  isWrTechInstitutionalRequest,
} from "@/lib/wrTechInstitutionalServer";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export async function generateMetadata(): Promise<Metadata> {
  if (await isWrTechAppRequest()) {
    const title = "WR Tech Solutions | Plataforma";
    const description =
      "Dominio reservado para a plataforma da WR Tech Solutions.";

    return {
      metadataBase: new URL(WR_TECH_APP_URL),
      applicationName: "WR Tech Solutions",
      title: {
        default: title,
        template: "%s",
      },
      description,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  if (await isWrTechInstitutionalRequest()) {
    const title = "WR Tech Solutions | Sistema para barbearias";
    const description =
      "Sistema SaaS para barbearias com agendamento online, painel do barbeiro, painel administrativo, financeiro e gestao profissional.";

    return {
      metadataBase: new URL(WR_TECH_SITE_URL),
      applicationName: "WR Tech Solutions",
      manifest: "/manifest.webmanifest",
      title: {
        default: title,
        template: "%s",
      },
      description,
      icons: {
        icon: [
          {
            url: WR_TECH_LOGO_PATH,
            sizes: "512x512",
            type: "image/png",
          },
        ],
        apple: [
          {
            url: WR_TECH_LOGO_PATH,
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
      openGraph: {
        title,
        description,
        url: "/",
        siteName: "WR Tech Solutions",
        images: [
          {
            url: WR_TECH_LOGO_PATH,
            width: 1200,
            height: 630,
            alt: "WR Tech Solutions",
          },
        ],
        locale: "pt_BR",
        type: "website",
      },
    };
  }

  const shop = await getCurrentShop();
  const brandName = shop.name || "Barbearia";
  const isJakBarber = shop.id === DEFAULT_SHOP_ID;
  const appName = isJakBarber ? JAKBARBER_APP_NAME : brandName;
  const description =
    shop.metadataDescription ||
    "Agende seu horario, acompanhe seus atendimentos e encontre maquinas para manter o cuidado em dia.";
  const faviconPath = isJakBarber
    ? JAKBARBER_FAVICON_32_PATH
    : shop.faviconPath || "";
  const title = shop.metadataTitle || brandName;

  return {
    metadataBase: new URL(getConfiguredAppUrl()),
    applicationName: appName,
    manifest: "/manifest.webmanifest",
    title: {
      default: title,
      template: "%s",
    },
    description,
    icons: isJakBarber
      ? {
          icon: [
            {
              url: JAKBARBER_FAVICON_32_PATH,
              sizes: "32x32",
              type: "image/png",
            },
            {
              url: JAKBARBER_FAVICON_48_PATH,
              sizes: "48x48",
              type: "image/png",
            },
            {
              url: JAKBARBER_ICON_192_PATH,
              sizes: "192x192",
              type: "image/png",
            },
          ],
          shortcut: [
            {
              url: JAKBARBER_FAVICON_32_PATH,
              type: "image/png",
            },
          ],
          apple: [
            {
              url: JAKBARBER_APPLE_TOUCH_ICON_PATH,
              sizes: "180x180",
              type: "image/png",
            },
          ],
        }
      : faviconPath
      ? {
          icon: [
            {
              url: faviconPath,
              sizes: "64x64",
              type: "image/png",
            },
          ],
          shortcut: [
            {
              url: faviconPath,
              type: "image/png",
            },
          ],
          apple: [
            {
              url: faviconPath,
              sizes: "180x180",
              type: "image/png",
            },
          ],
        }
      : undefined,
    appleWebApp: {
      capable: true,
      title: appName,
      statusBarStyle: isJakBarber ? "black-translucent" : "default",
      startupImage: isJakBarber ? JAKBARBER_STARTUP_IMAGES : undefined,
    },
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-title": appName,
    },
    openGraph: {
      title: brandName,
      description,
      url: "/",
      siteName: brandName,
      images: shop.logoPath
        ? [
            {
              url: shop.logoPath,
              width: 1200,
              height: 630,
              alt: brandName,
            },
          ]
        : undefined,
      locale: "pt_BR",
      type: "website",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  if (await isWrTechAppRequest()) {
    return {
      width: "device-width",
      initialScale: 1,
      viewportFit: "cover",
      themeColor: "#05070b",
      colorScheme: "dark",
    };
  }

  if (await isWrTechInstitutionalRequest()) {
    return {
      width: "device-width",
      initialScale: 1,
      viewportFit: "cover",
      themeColor: "#05070b",
      colorScheme: "dark",
    };
  }

  const shop = await getCurrentShop();
  const isJakBarber = shop.id === DEFAULT_SHOP_ID;

  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: isJakBarber
      ? JAKBARBER_THEME_COLOR
      : shop.brandColor || "#05070b",
    colorScheme: isJakBarber ? "dark" : "light dark",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (await isWrTechAppRequest()) {
    return (
      <html lang="pt-BR">
        <body
          className={`${bodyFont.variable} ${headingFont.variable} min-h-screen bg-[#05070b] text-white`}
          data-site="wr-tech-app"
        >
          <ClientRuntimeGuard />
          {children}
        </body>
      </html>
    );
  }

  if (await isWrTechInstitutionalRequest()) {
    return (
      <html lang="pt-BR">
        <body
          className={`${bodyFont.variable} ${headingFont.variable} min-h-screen bg-[#05070b] text-white`}
          data-site="wr-tech-solutions"
        >
          <ClientRuntimeGuard />
          {children}
        </body>
      </html>
    );
  }

  const session = await auth();
  const shop = await getCurrentShop();
  const role =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "BARBER" ||
    session?.user?.role === "CUSTOMER"
      ? session.user.role
      : null;
  if (role && (!session?.user?.shopId || shop.id !== session.user.shopId)) {
    redirect("/logout");
  }

  const brandName = shop.name || "Barbearia";
  const logoPath = shop.logoPath || "";
  const tenantBrandStyle =
    shop.id === "shop_rodrigo_style"
      ? ({
          "--app-bg": "#f8f5ef",
          "--app-gradient-start": "#fafaf7",
          "--app-gradient-mid": "#f8f5ef",
          "--app-gradient-end": "#efe7d8",
          "--panel-bg": "#ffffff",
          "--panel-bg-strong": "#ffffff",
          "--panel-border": "#e6dfd2",
          "--surface-soft": "rgba(255, 255, 255, 0.76)",
          "--text-primary": "#111111",
          "--text-secondary": "#5f5f5f",
          "--text-muted": "#767064",
          "--brand": "#c9972b",
          "--brand-strong": "#0b0b0b",
          "--brand-muted": "rgba(201, 151, 43, 0.16)",
          "--site-header-bg": "rgba(255, 255, 255, 0.96)",
          "--site-header-border": "#e6dfd2",
          "--site-header-text": "#0b0b0b",
          "--site-header-muted": "#5f5f5f",
          "--site-header-link": "#222222",
          "--site-header-link-hover": "#0b0b0b",
          "--site-header-active-text": "#0b0b0b",
          "--site-header-control-bg": "#ffffff",
          "--site-header-control-border": "#d8cfbf",
          "--site-header-control-text": "#0b0b0b",
        } as CSSProperties)
      : undefined;
  const customerPhone =
    role === "CUSTOMER" && session?.user?.id
      ? (
          await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { phone: true },
          })
        )?.phone || null
      : null;
  const shouldCompleteCustomerPhone = role === "CUSTOMER" && !customerPhone;

  return (
    <html lang="pt-BR">
      <body
        className={`${bodyFont.variable} ${headingFont.variable} min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]`}
        data-shop-id={shop.id}
        style={tenantBrandStyle}
      >
        <ClientRuntimeGuard />
        <AppChrome
          shopId={shop.id}
          brandName={brandName}
          logoPath={logoPath}
          publicEyebrow={brandName}
          role={role}
          userName={session?.user?.name || null}
          whatsappNumber={shop.whatsappNumber || ""}
          instagramUrl={shop.instagramUrl || ""}
          addressLine={shop.addressLine || ""}
          locationUrl={
            shop.id === DEFAULT_SHOP_ID
              ? "https://www.google.com/maps?ftid=0x94cefd02794bf5e3:0xd23868a9ee010185"
              : ""
          }
          businessHours={shop.businessHours || "Horario sob consulta"}
        >
          {children}
        </AppChrome>
        {shouldCompleteCustomerPhone ? <RequiredCustomerPhoneModal /> : null}
      </body>
    </html>
  );
}
