"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AppointmentMutationError,
  createCustomerAppointment,
} from "@/lib/appointmentMutations";
import type { FormFeedbackState } from "@/lib/formFeedbackState";
import { enforceRateLimit } from "@/lib/security";

export async function createAppointmentAction(
  _prevState: FormFeedbackState,
  formData: FormData
): Promise<FormFeedbackState> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "CUSTOMER") {
    redirect("/painel");
  }

  const rateLimit = await enforceRateLimit({
    scope: "booking:create_action",
    identifier: session.user.id,
    limit: 12,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      error: "Muitos agendamentos em pouco tempo. Tente novamente mais tarde.",
      success: null,
    };
  }

  const barberId = String(formData.get("barberId") || "");
  const serviceIds = String(formData.get("serviceIds") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const extrasRaw = String(formData.get("extras") || "");
  const extras = extrasRaw
    ? extrasRaw
        .split(",")
        .map((entry) => {
          const [extraProductId, quantity] = entry.split(":");
          return {
            extraProductId: (extraProductId || "").trim(),
            quantity: Number(quantity || 0),
          };
        })
        .filter(
          (extra) =>
            extra.extraProductId &&
            Number.isInteger(extra.quantity) &&
            extra.quantity > 0
        )
    : [];
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const notes = String(formData.get("notes") || "").trim();

  if (!barberId || serviceIds.length === 0 || !date || !time) {
    return {
      error: "Selecione barbeiro, servicos, data e horario para continuar.",
      success: null,
    };
  }

  try {
    await createCustomerAppointment({
      customerId: session.user.id,
      barberId,
      serviceIds,
      extras,
      date,
      time,
      notes,
    });
  } catch (error) {
    if (error instanceof AppointmentMutationError) {
      return {
        error: error.message,
        success: null,
      };
    }

    throw error;
  }

  revalidatePath("/customer");
  revalidatePath("/customer/agendamentos");
  revalidatePath("/meu-perfil");
  revalidatePath("/barber");
  revalidatePath("/barber/agenda");
  revalidatePath("/barber/clientes");
  revalidatePath(`/barber/clientes/${session.user.id}`);
  revalidatePath("/admin/agenda");
  revalidatePath("/agendar");

  redirect("/customer/agendamentos");
}
