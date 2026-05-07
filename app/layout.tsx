import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import AppChrome from "@/components/AppChrome";
import ClientRuntimeGuard from "@/components/ClientRuntimeGuard";
import { Manrope, Space_Grotesk } from "next/font/google";
import { auth } from "@/auth";
import type { Metadata } from "next";
import { getConfiguredAppUrl } from "@/lib/appUrl";
import { getCurrentShop } from "@/lib/shop";

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
  const brandName = shop.name || "Jak Barber";
  const description =
    shop.metadataDescription ||
    "Agende seu horário na Jak Barber, acompanhe seus atendimentos e encontre produtos para manter o cuidado em dia.";
  const faviconPath = shop.faviconPath || "/favicon.png?v=20260503-j";

  return {
    metadataBase: new URL(getConfiguredAppUrl()),
    title: {
      default: shop.metadataTitle || `${brandName} | Barbearia com hora marcada`,
      template: `%s | ${brandName}`,
    },
    description,
    icons: {
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
          url: "/apple-touch-icon.png?v=20260503-j",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    openGraph: {
      title: brandName,
      description,
      url: "/",
      siteName: brandName,
      images: [
        {
          url: "/cortes/corte1.webp",
          width: 1200,
          height: 630,
          alt: brandName,
        },
      ],
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
  const brandName = shop.name || "Jak Barber";
  const logoPath = shop.logoPath || "/logo.png";

  return (
    <html lang="pt-BR">
      <body
        className={`${bodyFont.variable} ${headingFont.variable} min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]`}
      >
        <ClientRuntimeGuard />
        <CartProvider>
          <AppChrome
            brandName={brandName}
            logoPath={logoPath}
            publicEyebrow={shop.slug === "jak-barber" ? "JakCompany" : shop.name}
            role={role}
            userName={session?.user?.name || null}
            whatsappNumber={shop.whatsappNumber || process.env.BARBER_WHATSAPP_NUMBER || ""}
            instagramUrl={shop.instagramUrl || "https://www.instagram.com/jakcompany_/"}
            addressLine={shop.addressLine || "Osasco, SP"}
            businessHours={shop.businessHours || "Terca a domingo, das 09h as 20h"}
          >
            {children}
          </AppChrome>
        </CartProvider>
      </body>
    </html>
  );
}
