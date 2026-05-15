import "./globals.css";
import AppChrome from "@/components/AppChrome";
import ClientRuntimeGuard from "@/components/ClientRuntimeGuard";
import RequiredCustomerPhoneModal from "@/components/RequiredCustomerPhoneModal";
import { Manrope, Space_Grotesk } from "next/font/google";
import { auth } from "@/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { getConfiguredAppUrl } from "@/lib/appUrl";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SHOP_ID, getCurrentShop } from "@/lib/shop";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getCurrentShop();
  const brandName = shop.name || "Barbearia";
  const description =
    shop.metadataDescription ||
    "Agende seu horario, acompanhe seus atendimentos e encontre produtos para manter o cuidado em dia.";
  const faviconPath = shop.faviconPath || "";
  const title = shop.metadataTitle || brandName;

  return {
    metadataBase: new URL(getConfiguredAppUrl()),
    title: {
      default: title,
      template: "%s",
    },
    description,
    icons: faviconPath
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
