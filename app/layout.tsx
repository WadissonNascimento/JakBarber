import "./globals.css";
import AppChrome from "@/components/AppChrome";
import ClientRuntimeGuard from "@/components/ClientRuntimeGuard";
import RequiredCustomerPhoneModal from "@/components/RequiredCustomerPhoneModal";
import { Manrope, Space_Grotesk } from "next/font/google";
import { auth } from "@/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
      >
        <ClientRuntimeGuard />
        <AppChrome
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
