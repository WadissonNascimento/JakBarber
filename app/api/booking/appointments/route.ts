import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  AppointmentMutationError,
  createCustomerAppointment,
} from "@/lib/appointmentMutations";
import { formatAppointmentPublicId } from "@/lib/appointmentPublicId";
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
      route: "/api/booking/appointments",
      role: session?.user?.role || "anonymous",
    });
    return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit({
    scope: "booking:create",
    identifier: session.user.id,
    limit: 12,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse("Muitos agendamentos em pouco tempo. Tente novamente mais tarde.");
  }

  try {
    const body = (await readJsonWithLimit(request, 8 * 1024)) as {
      barberId?: string;
      serviceIds?: string[];
      extras?: Array<{ extraProductId?: string; quantity?: number }>;
      date?: string;
      time?: string;
      notes?: string;
    };

    const barberId = String(body.barberId || "").trim();
    const serviceIds = Array.isArray(body.serviceIds)
      ? body.serviceIds.map((value) => String(value).trim()).filter(Boolean)
      : [];
    const extras = Array.isArray(body.extras)
      ? body.extras
          .map((extra) => ({
            extraProductId: String(extra?.extraProductId || "").trim(),
            quantity: Number(extra?.quantity || 0),
          }))
          .filter(
            (extra) =>
              extra.extraProductId &&
              Number.isInteger(extra.quantity) &&
              extra.quantity > 0
          )
      : [];
    const date = String(body.date || "").trim();
    const time = String(body.time || "").trim();
    const notes = String(body.notes || "").trim();

    const appointment = await createCustomerAppointment({
      customerId: session.user.id,
      barberId,
      serviceIds,
      extras,
      date,
      time,
      notes,
    });

    revalidatePath("/customer");
    revalidatePath("/customer/agendamentos");
    revalidatePath("/barber");
    revalidatePath("/admin/agenda");
    revalidatePath("/agendar");

    return NextResponse.json({
      message: "Agendamento realizado com sucesso.",
      appointmentId: appointment.id,
      appointmentCode: formatAppointmentPublicId(appointment.publicId),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
      return NextResponse.json({ message: "Requisicao muito grande." }, { status: 413 });
    }

    if (error instanceof AppointmentMutationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Erro ao criar agendamento:", error);
    return NextResponse.json(
      { message: "Nao foi possivel concluir o agendamento." },
      { status: 500 }
    );
  }
}
