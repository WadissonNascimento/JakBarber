import { buildWhatsAppUrl as buildNormalizedWhatsAppUrl } from "@/lib/whatsapp";
import { toMoneyNumber, type MoneyValue } from "@/lib/money";

export function formatCurrency(value: MoneyValue) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(toMoneyNumber(value));
}

export function buildWhatsAppUrl(message: string) {
  const number = process.env.BARBER_WHATSAPP_NUMBER || "";
  return buildNormalizedWhatsAppUrl(number, message) || "#";
}
