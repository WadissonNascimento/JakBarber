import { buildWhatsAppUrl as buildNormalizedWhatsAppUrl } from "@/lib/whatsapp";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function buildWhatsAppUrl(message: string) {
  const number = process.env.BARBER_WHATSAPP_NUMBER || "";
  return buildNormalizedWhatsAppUrl(number, message) || "#";
}
