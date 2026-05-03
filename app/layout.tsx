import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
    "Agende seu horario na Jak Barber, acompanhe seus atendimentos e encontre produtos para manter o cuidado em dia.";
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
          url: "/cortes/corte1.png",
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
  const hideFooter = role === "ADMIN" || role === "BARBER";

  return (
    <html lang="pt-BR">
      <body
        className={`${bodyFont.variable} ${headingFont.variable} min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]`}
      >
        <ClientRuntimeGuard />
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <Header
              brandName={shop.name || "Jak Barber"}
              logoPath={shop.logoPath || "/logo.png"}
              publicEyebrow={shop.slug === "jak-barber" ? "JakCompany" : shop.name}
              role={role}
              userName={session?.user?.name || null}
            />
            <main className="flex-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              {children}
            </main>
            {hideFooter ? null : (
              <Footer
                brandName={shop.name || "Jak Barber"}
                logoPath={shop.logoPath || "/logo.png"}
                whatsappNumber={shop.whatsappNumber || process.env.BARBER_WHATSAPP_NUMBER || ""}
                instagramUrl={shop.instagramUrl || "https://www.instagram.com/jakcompany_/"}
                addressLine={shop.addressLine || "Osasco, SP"}
                businessHours={shop.businessHours || "Terca a domingo, das 09h as 20h"}
              />
            )}
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
