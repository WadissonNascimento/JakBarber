import { formatScheduleDate, formatScheduleTime } from "@/lib/scheduleTime";

function stripPhone(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePhoneToWhatsApp(
  phone: string | null | undefined
): string | null {
  if (!phone) {
    return null;
  }

  let digits = stripPhone(phone);

  if (!digits) {
    return null;
  }

  digits = digits.replace(/^0+/, "");

  if (digits.startsWith("55")) {
    return digits.length >= 12 && digits.length <= 13 ? digits : null;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return null;
}

function formatAppointmentDate(value: Date) {
  return formatScheduleDate(new Date(value));
}

function formatAppointmentTime(value: Date) {
  return formatScheduleTime(new Date(value));
}

export function buildAppointmentContactWhatsAppUrl({
  customerName,
  barberName,
  serviceName,
  appointmentDate,
  customerPhone,
}: {
  customerName: string;
  barberName: string;
  serviceName: string;
  appointmentDate: Date;
  customerPhone: string | null | undefined;
}) {
  const normalizedPhone = normalizePhoneToWhatsApp(customerPhone);

  if (!normalizedPhone) {
    return null;
  }

  const message =
    `Olá, ${customerName}! Aqui é o barbeiro ${barberName} da barbearia.\n\n` +
    "Estou entrando em contato sobre seu agendamento:\n\n" +
    `📅 Data: ${formatAppointmentDate(appointmentDate)}\n` +
    `⏰ Horário: ${formatAppointmentTime(appointmentDate)}\n` +
    `✂️ Serviço: ${serviceName}\n\n` +
    "Qualquer dúvida ou necessidade de ajuste, me avise por aqui.";

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
