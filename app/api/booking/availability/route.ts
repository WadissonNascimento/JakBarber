import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  BookingAvailabilityError,
  getBookingAvailability,
} from "@/lib/bookingAvailability";
import { normalizeAppointmentStatus } from "@/lib/appointmentStatus";
import { prisma } from "@/lib/prisma";
import { isScheduleDateTimePast } from "@/lib/scheduleTime";
import {
  enforceRateLimit,
  logSecurityEvent,
  rateLimitResponse,
  readJsonWithLimit,
} from "@/lib/security";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    logSecurityEvent("access_denied", {
      route: "/api/booking/availability",
      role: session?.user?.role || "anonymous",
    });
    return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit({
    scope: "booking:availability",
    identifier: session.user.id,
    limit: 90,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse("Muitas consultas de horarios. Aguarde e tente novamente.");
  }

  try {
    const body = (await readJsonWithLimit(request, 8 * 1024)) as {
      barberId?: string;
      serviceIds?: string[];
      date?: string;
      rescheduleAppointmentId?: string;
    };

    const barberId = String(body.barberId || "").trim();
    const serviceIds = Array.isArray(body.serviceIds)
      ? body.serviceIds.map((value) => String(value).trim()).filter(Boolean)
      : [];
    const date = String(body.date || "").trim();
    const rescheduleAppointmentId = String(body.rescheduleAppointmentId || "").trim();

    if (rescheduleAppointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: {
          id: rescheduleAppointmentId,
        },
        select: {
          customerId: true,
          status: true,
          date: true,
        },
      });

      if (!appointment || appointment.customerId !== session.user.id) {
        logSecurityEvent("idor_blocked", {
          route: "/api/booking/availability",
          userId: session.user.id,
          appointmentId: rescheduleAppointmentId,
        });
        return NextResponse.json(
          { message: "Agendamento nao encontrado para sua conta." },
          { status: 404 }
        );
      }

      if (
        ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(
          normalizeAppointmentStatus(appointment.status)
        ) ||
        isScheduleDateTimePast(appointment.date)
      ) {
        return NextResponse.json(
          { message: "Esse agendamento nao pode mais ser remarcado." },
          { status: 400 }
        );
      }
    }

    const availability = await getBookingAvailability({
      barberId,
      serviceIds,
      date,
      excludeAppointmentId: rescheduleAppointmentId || undefined,
    });

    return NextResponse.json(availability);
  } catch (error) {
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
      return NextResponse.json({ message: "Requisicao muito grande." }, { status: 413 });
    }

    if (error instanceof BookingAvailabilityError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Erro ao carregar disponibilidade:", error);
    return NextResponse.json(
      { message: "Nao foi possivel carregar os horarios." },
      { status: 500 }
    );
  }
}
