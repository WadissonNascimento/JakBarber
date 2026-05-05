"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type AppChromeProps = {
  children: React.ReactNode;
  brandName: string;
  logoPath: string;
  publicEyebrow: string;
  role: "ADMIN" | "BARBER" | "CUSTOMER" | null;
  userName: string | null;
  whatsappNumber: string;
  instagramUrl: string;
  addressLine: string;
  businessHours: string;
};

export default function AppChrome({
  children,
  brandName,
  logoPath,
  publicEyebrow,
  role,
  userName,
  whatsappNumber,
  instagramUrl,
  addressLine,
  businessHours,
}: AppChromeProps) {
  const pathname = usePathname() || "/";
  const hideFooter =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/barber" ||
    pathname.startsWith("/barber/");

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        brandName={brandName}
        logoPath={logoPath}
        publicEyebrow={publicEyebrow}
        role={role}
        userName={userName}
      />
      <main className="flex-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      {hideFooter ? null : (
        <Footer
          brandName={brandName}
          logoPath={logoPath}
          whatsappNumber={whatsappNumber}
          instagramUrl={instagramUrl}
          addressLine={addressLine}
          businessHours={businessHours}
        />
      )}
    </div>
  );
}
