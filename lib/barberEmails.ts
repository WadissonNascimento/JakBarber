import "server-only";

import {
  renderBarberAppointmentCancelledEmail,
  renderBarberAppointmentRescheduledEmail,
  renderBarberDailyAgendaEmail,
  renderBarberNewAppointmentEmail,
  renderBarberNewReviewEmail,
  renderBarberNoShowEmail,
  type BarberAppointmentEmailData,
  type BarberDailyAgendaItem,
  type BarberEmailTheme,
} from "@/lib/email/barberTemplates";
import { getAppointmentDisplayName } from "@/lib/appointmentServices";
import { getConfiguredAppUrl } from "@/lib/appUrl";
import { sendEmailMessage } from "@/lib/mail";
import { basePrisma } from "@/lib/prisma-core";
import { getShopEmailIdentity } from "@/lib/shopEmailIdentity";
import {
  formatScheduleDate,
  formatScheduleTime,
  getCurrentScheduleDateValue,
  getScheduleDayRange,
} from "@/lib/scheduleTime";

const BARBER_PANEL_PATH = "/barber/agenda";
const DEFAULT_BRAND_COLOR = "#0ea5e9";
const TRANSPARENT_LOGO_DATA_URI = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

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
      email: true,
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

function getShopAppUrl(shop?: { primaryDomain?: string | null } | null) {
  const domain = shop?.primaryDomain?.trim();

  if (domain) {
    return `https://${domain.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`;
  }

  return getConfiguredAppUrl();
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
}): BarberEmailTheme {
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

function getCancellationReason(notes: string | null | undefined, fallback?: string | null) {
  if (fallback?.trim()) {
    return fallback.trim();
  }

  if (!notes?.trim()) {
    return null;
  }

  const parts = notes.split("|").map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || null;
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
): BarberAppointmentEmailData | null {
  const barberEmail = appointment.barber.email?.trim();

  if (!barberEmail) {
    return null;
  }

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

async function sendBarberAppointmentEmail({
  appointmentId,
  template,
  eventKey,
  render,
}: {
  appointmentId: string;
  template: string;
  eventKey: string;
  render: (
    appointment: NonNullable<Awaited<ReturnType<typeof loadAppointmentForBarberEmail>>>,
    data: BarberAppointmentEmailData
  ) => {
    subject: string;
    html: string;
    text: string;
  };
}) {
  try {
    const appointment = await loadAppointmentForBarberEmail(appointmentId);
    const data = appointment ? buildAppointmentData(appointment) : null;

    if (!appointment || !data || !appointment.barber.email) {
      return false;
    }

    const rendered = render(appointment, data);
    const emailIdentity = getShopEmailIdentity(appointment.shop.id);

    await sendEmailMessage({
      to: appointment.barber.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      template,
      eventKey,
      shopId: appointment.shop.id,
      recipientUserId: appointment.barber.id,
      metadata: {
        appointmentId: appointment.id,
        barberId: appointment.barber.id,
        customerId: appointment.customerId,
      },
      fromName: emailIdentity.fromName,
      replyTo: emailIdentity.replyTo,
    });

    return true;
  } catch (error) {
    console.warn(
      `[email] Falha ao preparar email do barbeiro (${template}) para ${appointmentId}: ${
        error instanceof Error ? error.message : "erro desconhecido"
      }`
    );
    return false;
  }
}

export async function notifyBarberNewAppointment(appointmentId: string) {
  return sendBarberAppointmentEmail({
    appointmentId,
    template: "barber.new_appointment",
    eventKey: `barber:new_appointment:${appointmentId}`,
    render: (_appointment, data) => renderBarberNewAppointmentEmail(data),
  });
}

export async function notifyBarberAppointmentCancelled(
  appointmentId: string,
  cancellationReason?: string | null
) {
  return sendBarberAppointmentEmail({
    appointmentId,
    template: "barber.appointment_cancelled",
    eventKey: `barber:appointment_cancelled:${appointmentId}`,
    render: (appointment, data) =>
      renderBarberAppointmentCancelledEmail({
        ...data,
        motivoCancelamento: getCancellationReason(appointment.notes, cancellationReason),
      }),
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
  return sendBarberAppointmentEmail({
    appointmentId,
    template: "barber.appointment_rescheduled",
    eventKey: `barber:appointment_rescheduled:${appointmentId}:${previousDate.toISOString()}`,
    render: (appointment, data) =>
      renderBarberAppointmentRescheduledEmail({
        ...data,
        horarioAntigo: formatDateTimeLabel(previousDate),
        novoHorario: formatDateTimeLabel(nextDate || appointment.date),
      }),
  });
}

export async function notifyBarberNoShow(appointmentId: string) {
  return sendBarberAppointmentEmail({
    appointmentId,
    template: "barber.no_show",
    eventKey: `barber:no_show:${appointmentId}`,
    render: (_appointment, data) => renderBarberNoShowEmail(data),
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
            email: true,
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

    if (!review?.barber.email) {
      return false;
    }

    const rendered = renderBarberNewReviewEmail({
      ...buildTheme(review.shop),
      linkPainel: absoluteAppUrl("/barber", review.shop),
      nomeBarbeiro: normalizeName(review.barber.name, "Barbeiro"),
      nomeCliente: normalizeName(review.customer.name, "Cliente"),
      servico: serviceLabel(review.appointment.services),
      dataAgendamento: formatDateLabel(review.appointment.date),
      horarioAgendamento: formatScheduleTime(review.appointment.date),
      telefoneCliente: review.customer.phone,
      observacoes: null,
      nota: review.rating,
      comentario: review.comment,
    });

    const emailIdentity = getShopEmailIdentity(review.shop.id);

    await sendEmailMessage({
      to: review.barber.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      template: "barber.new_review",
      eventKey: `barber:new_review:${review.id}`,
      shopId: review.shop.id,
      recipientUserId: review.barber.id,
      metadata: {
        reviewId: review.id,
        appointmentId: review.appointmentId,
        barberId: review.barberId,
        customerId: review.customerId,
        rating: review.rating,
      },
      fromName: emailIdentity.fromName,
      replyTo: emailIdentity.replyTo,
    });

    return true;
  } catch (error) {
    console.warn(
      `[email] Falha ao preparar email de avaliacao do barbeiro ${reviewId}: ${
        error instanceof Error ? error.message : "erro desconhecido"
      }`
    );
    return false;
  }
}

function toAgendaItem(
  appointment: {
    date: Date;
    notes: string | null;
    customer: {
      name: string | null;
      phone: string | null;
    };
    services: Array<{
      nameSnapshot: string;
      orderIndex: number;
    }>;
  }
): BarberDailyAgendaItem {
  return {
    horario: formatScheduleTime(appointment.date),
    cliente: normalizeName(appointment.customer.name, "Cliente"),
    servico: serviceLabel(appointment.services),
    telefoneCliente: appointment.customer.phone,
    observacoes: appointment.notes,
  };
}

export async function sendDailyBarberAgendaEmails({
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
      email: {
        not: null,
      },
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

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const barber of barbers) {
    const appointments = barber.barberAppointments;

    if (!includeEmptyAgenda && appointments.length === 0) {
      skipped += 1;
      continue;
    }

    const rendered = renderBarberDailyAgendaEmail({
      ...buildTheme(barber.shop),
      nomeBarbeiro: normalizeName(barber.name, "Barbeiro"),
      dataAgendamento: formatScheduleDate(range.start, {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      quantidadeAtendimentos: appointments.length,
      atendimentos: appointments.map(toAgendaItem),
    });

    const emailIdentity = getShopEmailIdentity(barber.shop.id);
    const result = await sendEmailMessage({
      to: barber.email || "",
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      template: "barber.daily_agenda",
      eventKey: `barber:daily_agenda:${barber.id}:${date}`,
      shopId: barber.shop.id,
      recipientUserId: barber.id,
      metadata: {
        barberId: barber.id,
        date,
        appointmentCount: appointments.length,
      },
      fromName: emailIdentity.fromName,
      replyTo: emailIdentity.replyTo,
    });

    if (result.sent) {
      sent += 1;
    } else if (result.skipped) {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  return {
    checked: barbers.length,
    sent,
    skipped,
    failed,
  };
}
