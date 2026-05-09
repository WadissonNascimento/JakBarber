import nodemailer from "nodemailer";
import path from "path";
import { Prisma } from "@prisma/client";
import { getConfiguredAppUrl } from "@/lib/appUrl";
import {
  renderCustomerAppointmentCancelledEmail,
  renderCustomerAppointmentCompletedEmail,
  renderCustomerAppointmentConfirmationEmail,
  renderCustomerAppointmentReminderEmail,
  renderCustomerPasswordResetEmail,
  renderCustomerVerificationCodeEmail,
  type CustomerAppointmentEmailData,
  type CustomerEmailTheme,
} from "@/lib/email/customerTemplates";
import { basePrisma } from "@/lib/prisma-core";
import { getCurrentShop } from "@/lib/shop";

const LOGO_CID = "jak-barber-logo";
export const DEFAULT_EMAIL_LOGO_CID = LOGO_CID;

export type EmailDeliveryMetadata = Prisma.InputJsonValue;

export type SendEmailMessageInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  template: string;
  eventKey: string;
  shopId?: string;
  recipientUserId?: string | null;
  metadata?: EmailDeliveryMetadata;
  attachments?: Array<{
    filename: string;
    path: string;
    cid?: string;
  }>;
  maxAttempts?: number;
};

const DEFAULT_SHOP_ID = "shop_jak_barber";
const DEFAULT_SHOP_NAME = "Jak Barber";
const DEFAULT_BRAND_COLOR = "#0ea5e9";

function formatFromAddress(from: string) {
  return from.includes("<") ? from : `Jak Barber <${from}>`;
}

function getLogoAttachment() {
  return {
    filename: "logo.png",
    path: path.join(process.cwd(), "public", "logo.png"),
    cid: LOGO_CID,
  };
}

export function getDefaultLogoAttachment() {
  return getLogoAttachment();
}

function resolveEmailLogoUrl(logoPath: string | null | undefined) {
  const value = logoPath?.trim();

  if (!value) {
    return `cid:${LOGO_CID}`;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const appUrl = getConfiguredAppUrl();
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${appUrl}${normalizedPath}`;
}

function buildCustomerThemeFromShop(shop: {
  name?: string | null;
  logoPath?: string | null;
  brandColor?: string | null;
  addressLine?: string | null;
  whatsappNumber?: string | null;
}): CustomerEmailTheme {
  return {
    nomeBarbearia: shop.name?.trim() || DEFAULT_SHOP_NAME,
    logoBarbearia: resolveEmailLogoUrl(shop.logoPath),
    corPrimaria: shop.brandColor?.trim() || DEFAULT_BRAND_COLOR,
    enderecoBarbearia: shop.addressLine || null,
    telefoneBarbearia: shop.whatsappNumber || null,
  };
}

async function getCurrentCustomerEmailTheme() {
  const shop = await getCurrentShop().catch(() => null);

  return buildCustomerThemeFromShop({
    name: shop?.name,
    logoPath: shop?.logoPath,
    brandColor: shop?.brandColor,
    addressLine: shop?.addressLine,
    whatsappNumber: shop?.whatsappNumber,
  });
}

function getMailConfig() {
  const host = process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.EMAIL_SERVER_PORT || "587");
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASS;
  const from = process.env.EMAIL_FROM || user;

  if (!host || !user || !pass || !from) {
    throw new Error("Configuracao de e-mail incompleta.");
  }

  return {
    host,
    port,
    user,
    pass,
    from,
  };
}

function shouldUseConsoleMailFallback() {
  return process.env.NODE_ENV !== "production";
}

export function isUsingDevelopmentMailFallback() {
  const host = process.env.EMAIL_SERVER_HOST;
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASS;
  const from = process.env.EMAIL_FROM || user;

  return shouldUseConsoleMailFallback() && (!host || !user || !pass || !from);
}

export function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeEmailError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : "Erro desconhecido.";
}

function getEmailLogWhere({
  shopId,
  template,
  eventKey,
  recipientEmail,
}: {
  shopId: string;
  template: string;
  eventKey: string;
  recipientEmail: string;
}) {
  return {
    shopId_template_eventKey_recipientEmail: {
      shopId,
      template,
      eventKey,
      recipientEmail,
    },
  };
}

async function getExistingSentEmailLog({
  shopId,
  template,
  eventKey,
  recipientEmail,
}: {
  shopId: string;
  template: string;
  eventKey: string;
  recipientEmail: string;
}) {
  try {
    return await basePrisma.emailDeliveryLog.findUnique({
      where: getEmailLogWhere({
        shopId,
        template,
        eventKey,
        recipientEmail,
      }),
      select: {
        id: true,
        status: true,
      },
    });
  } catch (error) {
    console.warn("[email] Nao foi possivel consultar log de envio:", normalizeEmailError(error));
    return null;
  }
}

async function recordEmailDeliveryAttempt({
  shopId,
  recipientUserId,
  recipientEmail,
  template,
  eventKey,
  subject,
  status,
  attempts,
  lastError,
  metadata,
  sentAt,
}: {
  shopId: string;
  recipientUserId?: string | null;
  recipientEmail: string;
  template: string;
  eventKey: string;
  subject: string;
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
  attempts: number;
  lastError?: string | null;
  metadata?: EmailDeliveryMetadata;
  sentAt?: Date | null;
}) {
  try {
    await basePrisma.emailDeliveryLog.upsert({
      where: getEmailLogWhere({
        shopId,
        template,
        eventKey,
        recipientEmail,
      }),
      create: {
        shopId,
        recipientUserId: recipientUserId || null,
        recipientEmail,
        template,
        eventKey,
        subject,
        status,
        attempts,
        lastError: lastError || null,
        metadata: metadata ?? Prisma.JsonNull,
        sentAt: sentAt || null,
      },
      update: {
        recipientUserId: recipientUserId || null,
        subject,
        status,
        attempts,
        lastError: lastError || null,
        metadata: metadata ?? Prisma.JsonNull,
        sentAt: sentAt || null,
      },
    });
  } catch (error) {
    console.warn("[email] Nao foi possivel gravar log de envio:", normalizeEmailError(error));
  }
}

async function sendMailOnce({
  to,
  subject,
  text,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: SendEmailMessageInput["attachments"];
}) {
  const config = getMailConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: formatFromAddress(config.from),
    to,
    subject,
    text,
    html,
    attachments: attachments?.length ? attachments : [getLogoAttachment()],
  });
}

export async function sendEmailMessage({
  to,
  subject,
  text,
  html,
  template,
  eventKey,
  shopId = "shop_jak_barber",
  recipientUserId,
  metadata,
  attachments,
  maxAttempts = 2,
}: SendEmailMessageInput) {
  const recipientEmail = to.trim().toLowerCase();
  const attemptsLimit = Math.max(1, Math.min(maxAttempts, 3));

  if (!isValidEmailAddress(recipientEmail)) {
    await recordEmailDeliveryAttempt({
      shopId,
      recipientUserId,
      recipientEmail,
      template,
      eventKey,
      subject,
      status: "FAILED",
      attempts: 0,
      lastError: "E-mail do destinatario invalido.",
      metadata,
    });

    console.warn(`[email] Destinatario invalido para ${template}: ${recipientEmail}`);
    return { sent: false, skipped: true, attempts: 0 };
  }

  const existingLog = await getExistingSentEmailLog({
    shopId,
    template,
    eventKey,
    recipientEmail,
  });

  if (existingLog?.status === "SENT") {
    console.info(`[email] Envio duplicado ignorado: template=${template} eventKey=${eventKey}`);
    return { sent: false, skipped: true, attempts: 0 };
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attemptsLimit; attempt += 1) {
    await recordEmailDeliveryAttempt({
      shopId,
      recipientUserId,
      recipientEmail,
      template,
      eventKey,
      subject,
      status: "PENDING",
      attempts: attempt - 1,
      metadata,
    });

    try {
      await sendMailOnce({
        to: recipientEmail,
        subject,
        text,
        html,
        attachments,
      });

      await recordEmailDeliveryAttempt({
        shopId,
        recipientUserId,
        recipientEmail,
        template,
        eventKey,
        subject,
        status: "SENT",
        attempts: attempt,
        metadata,
        sentAt: new Date(),
      });

      console.info(`[email] Enviado: template=${template} to=${recipientEmail}`);
      return { sent: true, skipped: false, attempts: attempt };
    } catch (error) {
      lastError = error;

      if (shouldUseConsoleMailFallback()) {
        logDevelopmentMessageEmail({
          to: recipientEmail,
          subject,
          appointmentCode: eventKey,
        });

        await recordEmailDeliveryAttempt({
          shopId,
          recipientUserId,
          recipientEmail,
          template,
          eventKey,
          subject,
          status: "SENT",
          attempts: attempt,
          metadata,
          sentAt: new Date(),
        });

        return { sent: true, skipped: false, attempts: attempt };
      }
    }
  }

  await recordEmailDeliveryAttempt({
    shopId,
    recipientUserId,
    recipientEmail,
    template,
    eventKey,
    subject,
    status: "FAILED",
    attempts: attemptsLimit,
    lastError: normalizeEmailError(lastError),
    metadata,
  });

  console.warn(
    `[email] Falha final: template=${template} to=${recipientEmail} error=${normalizeEmailError(lastError)}`
  );

  return { sent: false, skipped: false, attempts: attemptsLimit };
}

function logDevelopmentEmail({
  to,
  subject,
  code,
  verifyUrl,
}: {
  to: string;
  subject: string;
  code: string;
  verifyUrl?: string;
}) {
  console.info(
    [
      "[email-dev]",
      `to=${to}`,
      `subject=${subject}`,
      `code=${code}`,
      verifyUrl ? `url=${verifyUrl}` : null,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export type AppointmentCustomerEmailPayload = {
  to: string;
  shopId?: string;
  recipientUserId?: string | null;
  eventKey?: string;
  nomeBarbearia?: string;
  logoBarbearia?: string;
  corPrimaria?: string;
  enderecoBarbearia?: string | null;
  telefoneBarbearia?: string | null;
  customerName: string;
  appointmentCode: string;
  barberName: string;
  serviceName: string;
  serviceMeta: string;
  dateLabel: string;
  timeLabel: string;
  totalLabel: string;
  extrasLabel?: string;
  actionUrl?: string;
  reviewUrl?: string;
  cancellationReason?: string | null;
};

function logDevelopmentMessageEmail({
  to,
  subject,
  appointmentCode,
}: {
  to: string;
  subject: string;
  appointmentCode?: string;
}) {
  console.info(
    [
      "[email-dev]",
      `to=${to}`,
      `subject=${subject}`,
      appointmentCode ? `appointment=${appointmentCode}` : null,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getCustomerThemeFromAppointmentPayload(
  payload: AppointmentCustomerEmailPayload
): CustomerEmailTheme {
  return {
    nomeBarbearia: payload.nomeBarbearia?.trim() || DEFAULT_SHOP_NAME,
    logoBarbearia: payload.logoBarbearia || `cid:${LOGO_CID}`,
    corPrimaria: payload.corPrimaria?.trim() || DEFAULT_BRAND_COLOR,
    enderecoBarbearia: payload.enderecoBarbearia || null,
    telefoneBarbearia: payload.telefoneBarbearia || null,
  };
}

function buildCustomerAppointmentTemplateData(
  payload: AppointmentCustomerEmailPayload
) {
  const theme = getCustomerThemeFromAppointmentPayload(payload);

  return {
    ...theme,
    nomeCliente: payload.customerName?.trim() || "cliente",
    nomeBarbeiro: payload.barberName?.trim() || "barbeiro",
    servico: payload.serviceName?.trim() || "Servico agendado",
    detalhesServico: payload.serviceMeta?.trim() || "Detalhes indisponiveis",
    dataAgendamento: payload.dateLabel?.trim() || "Data indisponivel",
    horarioAgendamento: payload.timeLabel?.trim() || "Horario indisponivel",
    codigoAgendamento: payload.appointmentCode?.trim() || "Sem codigo",
    valorTotal: payload.totalLabel?.trim() || "Valor indisponivel",
    extras: payload.extrasLabel,
    motivoCancelamento: payload.cancellationReason || null,
    linkPainelCliente: payload.actionUrl,
    linkAvaliacao: payload.reviewUrl || payload.actionUrl,
  };
}

async function sendAppointmentCustomerEmail(
  payload: AppointmentCustomerEmailPayload,
  {
    template,
    eventName,
    render,
  }: {
    template: string;
    eventName: string;
    render: (data: CustomerAppointmentEmailData) => {
      subject: string;
      html: string;
      text: string;
    };
  }
) {
  const data = buildCustomerAppointmentTemplateData(payload);
  const rendered = render(data);

  await sendEmailMessage({
    to: payload.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    template,
    eventKey:
      payload.eventKey ||
      `customer:${eventName}:${payload.appointmentCode || payload.to}`,
    shopId: payload.shopId || DEFAULT_SHOP_ID,
    recipientUserId: payload.recipientUserId || null,
    metadata: {
      appointmentCode: payload.appointmentCode,
      eventName,
    },
    attachments: [getLogoAttachment()],
  });
}

export async function sendAppointmentConfirmationEmail(
  payload: AppointmentCustomerEmailPayload
) {
  await sendAppointmentCustomerEmail(payload, {
    template: "customer.appointment_confirmation",
    eventName: "appointment_confirmation",
    render: renderCustomerAppointmentConfirmationEmail,
  });
}

export async function sendAppointmentCompletedEmail(
  payload: AppointmentCustomerEmailPayload
) {
  await sendAppointmentCustomerEmail(payload, {
    template: "customer.appointment_completed",
    eventName: "appointment_completed",
    render: renderCustomerAppointmentCompletedEmail,
  });
}

export async function sendAppointmentCancelledEmail(
  payload: AppointmentCustomerEmailPayload
) {
  await sendAppointmentCustomerEmail(payload, {
    template: "customer.appointment_cancelled",
    eventName: "appointment_cancelled",
    render: renderCustomerAppointmentCancelledEmail,
  });
}

export async function sendAppointmentReminderEmail(
  payload: AppointmentCustomerEmailPayload
) {
  await sendAppointmentCustomerEmail(payload, {
    template: "customer.appointment_reminder",
    eventName: "appointment_reminder",
    render: renderCustomerAppointmentReminderEmail,
  });
}

export async function sendVerificationCodeEmail({
  to,
  name,
  code,
  verifyUrl,
  accountLabel = "cadastro",
}: {
  to: string;
  name: string;
  code: string;
  verifyUrl?: string;
  accountLabel?: string;
}) {
  if (shouldUseConsoleMailFallback()) {
    logDevelopmentEmail({
      to,
      subject: "Codigo de verificacao - Jak Barber",
      code,
      verifyUrl,
    });
  }

  const theme = await getCurrentCustomerEmailTheme();
  const rendered = renderCustomerVerificationCodeEmail({
    ...theme,
    nomeCliente: name || "cliente",
    codigoVerificacao: code,
    linkAcao: verifyUrl,
    rotuloAcao: verifyUrl ? "Abrir verificacao" : undefined,
    contexto: accountLabel,
  });

  const result = await sendEmailMessage({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    template: "customer.email_verification",
    eventKey: `customer:email_verification:${to.trim().toLowerCase()}:${Date.now()}`,
    metadata: {
      accountLabel,
    },
    attachments: [getLogoAttachment()],
  });

  if (!result.sent) {
    throw new Error("Nao foi possivel enviar o codigo de verificacao.");
  }
}

export async function sendPasswordResetCodeEmail({
  to,
  name,
  code,
}: {
  to: string;
  name: string;
  code: string;
}) {
  if (shouldUseConsoleMailFallback()) {
    logDevelopmentEmail({
      to,
      subject: "Recuperacao de senha - Jak Barber",
      code,
    });
  }

  const resetUrl = `${getConfiguredAppUrl()}/forgot-password/reset?email=${encodeURIComponent(
    to.trim().toLowerCase()
  )}`;
  const theme = await getCurrentCustomerEmailTheme();
  const rendered = renderCustomerPasswordResetEmail({
    ...theme,
    nomeCliente: name || "cliente",
    codigoVerificacao: code,
    linkAcao: resetUrl,
    rotuloAcao: "Abrir redefinicao",
    contexto: "a recuperacao de senha",
  });

  const result = await sendEmailMessage({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    template: "customer.password_reset",
    eventKey: `customer:password_reset:${to.trim().toLowerCase()}:${Date.now()}`,
    metadata: {
      resetRequested: true,
    },
    attachments: [getLogoAttachment()],
  });

  if (!result.sent) {
    throw new Error("Nao foi possivel enviar o codigo de recuperacao.");
  }
}
