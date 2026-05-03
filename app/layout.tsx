import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientRuntimeGuard from "@/components/ClientRuntimeGuard";
import { Manrope, Space_Grotesk } from "next/font/google";
import { auth } from "@/auth";
import type { Metadata } from "next";
import { getConfiguredAppUrl } from "@/lib/appUrl";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  metadataBase: new URL(getConfiguredAppUrl()),
  title: {
    default: "Jak Barber | Barbearia com hora marcada",
    template: "%s | Jak Barber",
  },
  description:
    "Agende seu horario na Jak Barber, acompanhe seus atendimentos e encontre produtos para manter o cuidado em dia.",
  openGraph: {
    title: "Jak Barber",
    description: "Barbearia com agendamento online e atendimento com hora marcada.",
    url: "/",
    siteName: "Jak Barber",
    images: [
      {
        url: "/cortes/corte1.png",
        width: 1200,
        height: 630,
        alt: "Jak Barber",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
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
              role={role}
              userName={session?.user?.name || null}
            />
            <main className="flex-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              {children}
            </main>
            {hideFooter ? null : <Footer />}
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
