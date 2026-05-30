import "server-only";

import { getAppointmentDisplayName } from "@/lib/appointmentServices";
import { formatAppointmentPublicId } from "@/lib/appointmentPublicId";
import { createAppNotificationSafely } from "@/lib/appNotifications";
import { getShopAppUrl } from "@/lib/appUrl";
import { basePrisma } from "@/lib/prisma-core";
import {
  formatScheduleDate,
  formatScheduleTime,
  getCurrentScheduleDateValue,
  getScheduleDayRange,
} from "@/lib/scheduleTime";

const BARBER_PANEL_PATH = "/barber/agenda";
const DEFAULT_BRAND_COLOR = "#0ea5e9";
const TRANSPARENT_LOGO_DATA_URI = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

type BarberNotificationTheme = {
  nomeBarbearia: string;
  logoBarbearia: string;
  corPrimaria: string;
  enderecoBarbearia: string | null;
  linkPainel: string;
};

type BarberAppointmentNotificationData = BarberNotificationTheme & {
  nomeBarbeiro: string;
  nomeCliente: string;
  servico: string;
  dataAgendamento: string;
  horarioAgendamento: string;
  telefoneCliente: string | null;
  observacoes: string | null;
};

const appointmentEmailInclude = {
  shop: {
    select: {
      id: true,
      name: true,
      primaryDomain: true,
      addressLine: true,
      logoPath: true,
      brandColor: true,
    },
  },
  barber: {
    select: {
      id: true,
      name: true,
    },
  },
  customer: {
    select: {
      name: true,
      phone: true,
    },
  },
  services: {
    orderBy: {
      orderIndex: "asc" as const,
    },
    select: {
      nameSnapshot: true,
      orderIndex: true,
    },
  },
};

function normalizeName(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function absoluteAppUrl(pathname: string, shop?: { primaryDomain?: string | null } | null) {
  const appUrl = getShopAppUrl(shop);
  return `${appUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function resolveLogoUrl(
  pathname: string | null | undefined,
  shop?: { primaryDomain?: string | null } | null
) {
  const trimmed = pathname?.trim();

  if (!trimmed) {
    return TRANSPARENT_LOGO_DATA_URI;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return absoluteAppUrl(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, shop);
}

function buildTheme(shop: {
  id: string;
  name: string;
  primaryDomain?: string | null;
  addressLine: string | null;
  logoPath: string | null;
  brandColor: string | null;
}): BarberNotificationTheme {
  return {
    nomeBarbearia: shop.name,
    logoBarbearia: resolveLogoUrl(shop.logoPath, shop),
    corPrimaria: shop.brandColor || DEFAULT_BRAND_COLOR,
    enderecoBarbearia: shop.addressLine,
    linkPainel: absoluteAppUrl(BARBER_PANEL_PATH, shop),
  };
}

function formatDateLabel(date: Date) {
  return formatScheduleDate(date, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTimeLabel(date: Date) {
  return `${formatDateLabel(date)} as ${formatScheduleTime(date)}`;
}

function serviceLabel(
  services: Array<{
    nameSnapshot: string;
    orderIndex: number;
  }>
) {
  return getAppointmentDisplayName(services) || "Servico agendado";
}

async function loadAppointmentForBarberEmail(appointmentId: string) {
  return basePrisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: appointmentEmailInclude,
  });
}

function buildAppointmentData(
  appointment: NonNullable<Awaited<ReturnType<typeof loadAppointmentForBarberEmail>>>
): BarberAppointmentNotificationData {
  return {
    ...buildTheme(appointment.shop),
    nomeBarbeiro: normalizeName(appointment.barber.name, "Barbeiro"),
    nomeCliente: normalizeName(appointment.customer.name, "Cliente"),
    servico: serviceLabel(appointment.services),
    dataAgendamento: formatDateLabel(appointment.date),
    horarioAgendamento: formatScheduleTime(appointment.date),
    telefoneCliente: appointment.customer.phone,
    observacoes: appointment.notes,
  };
}

async function notifyBarberAppointment({
  appointmentId,
  template,
  eventKey,
  notificationMetadata,
}: {
  appointmentId: string;
  template: string;
  eventKey: string;
  notificationMetadata?: Record<string, string | number | null | undefined>;
}) {
  try {
    const appointment = await loadAppointmentForBarberEmail(appointmentId);

    if (!appointment) {
      return false;
    }

    const data = buildAppointmentData(appointment);
    const notification = await createAppNotificationSafely({
      shopId: appointment.shop.id,
      recipientUserId: appointment.barber.id,
      type: template,
      eventKey,
      eyebrow: getBarberNotificationEyebrow(template),
      title: getBarberNotificationTitle(template),
      body: getBarberNotificationBody(template, data),
      actionUrl: absoluteAppUrl(BARBER_PANEL_PATH, appointment.shop),
      metadata: {
        appointmentId: appointment.id,
        appointmentCode: formatAppointmentPublicId(appointment.publicId),
        customerName: data.nomeCliente,
        phone: data.telefoneCliente,
        serviceName: data.servico,
        date: data.dataAgendamento,
        time: data.horarioAgendamento,
        ...notificationMetadata,
      },
    });

    return Boolean(notification);
  } catch (error) {
    console.warn(
      `[notification] Falha ao preparar notificacao do barbeiro (${template}) para ${appointmentId}: ${
        error instanceof Error ? error.message : "erro desconhecido"
      }`
    );
    return false;
  }
}

function getBarberNotificationEyebrow(template: string) {
  if (template === "barber.daily_agenda") return "Agenda";
  if (template === "barber.new_review") return "Avaliacao";
  return "Atendimento";
}

function getBarberNotificationTitle(template: string) {
  switch (template) {
    case "barber.new_appointment":
      return "Novo agendamento";
    case "barber.appointment_cancelled":
      return "Agendamento cancelado";
    case "barber.appointment_rescheduled":
      return "Agendamento reagendado";
    case "barber.no_show":
      return "Cliente marcado como falta";
    default:
      return "Atualizacao da agenda";
  }
}

function getBarberNotificationBody(
  template: string,
  data: BarberAppointmentNotificationData
) {
  switch (template) {
    case "barber.new_appointment":
      return `${data.nomeCliente} marcou ${data.servico} para ${data.horarioAgendamento}.`;
    case "barber.appointment_cancelled":
      return `${data.nomeCliente} teve o agendamento de ${data.servico} cancelado.`;
    case "barber.appointment_rescheduled":
      return `${data.nomeCliente} teve o agendamento de ${data.servico} reagendado.`;
    case "barber.no_show":
      return `${data.nomeCliente} foi marcado como falta.`;
    default:
      return `${data.nomeCliente} teve uma atualizacao no atendimento.`;
  }
}

export async function notifyBarberNewAppointment(appointmentId: string) {
  return notifyBarberAppointment({
    appointmentId,
    template: "barber.new_appointment",
    eventKey: `barber:new_appointment:${appointmentId}`,
  });
}

export async function notifyBarberAppointmentCancelled(
  appointmentId: string,
  cancellationReason?: string | null
) {
  const notificationMetadata = {
    cancellationReason,
  };

  return notifyBarberAppointment({
    appointmentId,
    template: "barber.appointment_cancelled",
    eventKey: `barber:appointment_cancelled:${appointmentId}`,
    notificationMetadata,
  });
}

export async function notifyBarberAppointmentRescheduled({
  appointmentId,
  previousDate,
  nextDate,
}: {
  appointmentId: string;
  previousDate: Date;
  nextDate?: Date;
}) {
  return notifyBarberAppointment({
    appointmentId,
    template: "barber.appointment_rescheduled",
    eventKey: `barber:appointment_rescheduled:${appointmentId}:${previousDate.toISOString()}`,
    notificationMetadata: {
      previousDateTime: formatDateTimeLabel(previousDate),
      nextDateTime: formatDateTimeLabel(nextDate || new Date()),
    },
  });
}

export async function notifyBarberNoShow(appointmentId: string) {
  return notifyBarberAppointment({
    appointmentId,
    template: "barber.no_show",
    eventKey: `barber:no_show:${appointmentId}`,
  });
}

export async function notifyBarberNewReview(reviewId: string) {
  try {
    const review = await basePrisma.review.findUnique({
      where: {
        id: reviewId,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            primaryDomain: true,
            addressLine: true,
            logoPath: true,
            brandColor: true,
          },
        },
        barber: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            name: true,
            phone: true,
          },
        },
        appointment: {
          include: {
            services: {
              orderBy: {
                orderIndex: "asc",
              },
              select: {
                nameSnapshot: true,
                orderIndex: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      return false;
    }

    const notification = await createAppNotificationSafely({
      shopId: review.shop.id,
      recipientUserId: review.barber.id,
      type: "barber.new_review",
      eventKey: `barber:new_review:${review.id}`,
      eyebrow: "Avaliacao",
      title: "Nova avaliacao recebida",
      body: `${normalizeName(review.customer.name, "Cliente")} avaliou seu atendimento com ${review.rating} estrela(s).`,
      actionUrl: absoluteAppUrl("/barber", review.shop),
      metadata: {
        reviewId: review.id,
        appointmentId: review.appointmentId,
        customerName: normalizeName(review.customer.name, "Cliente"),
        phone: review.customer.phone,
        serviceName: serviceLabel(review.appointment.services),
        date: formatDateLabel(review.appointment.date),
        time: formatScheduleTime(review.appointment.date),
        rating: review.rating,
        reviewComment: review.comment,
      },
    });

    return Boolean(notification);
  } catch (error) {
    console.warn(
      `[notification] Falha ao preparar notificacao de avaliacao do barbeiro ${reviewId}: ${
        error instanceof Error ? error.message : "erro desconhecido"
      }`
    );
    return false;
  }
}

export async function sendDailyBarberAgendaNotifications({
  date = getCurrentScheduleDateValue(),
  includeEmptyAgenda = false,
  take = 100,
}: {
  date?: string;
  includeEmptyAgenda?: boolean;
  take?: number;
} = {}) {
  const range = getScheduleDayRange(date);

  if (!range) {
    return {
      checked: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    };
  }

  const barbers = await basePrisma.user.findMany({
    where: {
      role: "BARBER",
      isActive: true,
    },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          primaryDomain: true,
          addressLine: true,
          logoPath: true,
          brandColor: true,
        },
      },
      barberAppointments: {
        where: {
          date: {
            gte: range.start,
            lte: range.end,
          },
          status: {
            notIn: ["CANCELLED", "NO_SHOW"],
          },
        },
        include: {
          customer: {
            select: {
              name: true,
              phone: true,
            },
          },
          services: {
            orderBy: {
              orderIndex: "asc",
            },
            select: {
              nameSnapshot: true,
              orderIndex: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      },
    },
    take,
  });

  let notified = 0;
  let skipped = 0;
  let failed = 0;

  for (const barber of barbers) {
    const appointments = barber.barberAppointments;

    if (!includeEmptyAgenda && appointments.length === 0) {
      skipped += 1;
      continue;
    }

    const notification = await createAppNotificationSafely({
      shopId: barber.shop.id,
      recipientUserId: barber.id,
      type: "barber.daily_agenda",
      eventKey: `barber:daily_agenda:${barber.id}:${date}`,
      eyebrow: "Agenda",
      title: "Sua agenda do dia",
      body:
        appointments.length === 1
          ? "Voce tem 1 atendimento agendado hoje."
          : `Voce tem ${appointments.length} atendimentos agendados hoje.`,
      actionUrl: absoluteAppUrl(BARBER_PANEL_PATH, barber.shop),
      metadata: {
        appointmentCount: appointments.length,
        date,
        appointments: appointments.map((appointment) => ({
          appointmentCode: formatAppointmentPublicId(appointment.publicId),
          customerName: normalizeName(appointment.customer.name, "Cliente"),
          phone: appointment.customer.phone,
          serviceName: serviceLabel(appointment.services),
          date: formatScheduleDate(appointment.date),
          time: formatScheduleTime(appointment.date),
          status: "CONFIRMED",
        })),
      },
    });

    if (notification) {
      notified += 1;
    } else {
      failed += 1;
    }
  }

  return {
    checked: barbers.length,
    sent: notified,
    notified,
    skipped,
    failed,
  };
}
