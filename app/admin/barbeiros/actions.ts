"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { sendVerificationCodeEmail } from "@/lib/mail";
import { getConfiguredAppUrl } from "@/lib/appUrl";
import {
  mutationError,
  mutationSuccess,
  type MutationResult,
} from "@/lib/mutationResult";
import { deleteLocalBarberPhoto, saveBarberPhoto } from "@/lib/barberPhoto";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Nao autorizado.");
  }

  return session.user;
}

function generateVerificationCode() {
  return randomInt(100000, 1000000).toString();
}

function getExpirationDate() {
  return new Date(Date.now() + 10 * 60 * 1000);
}

function buildVerificationUrl(email: string) {
  return `${getConfiguredAppUrl()}/register/verify?email=${encodeURIComponent(email)}`;
}

export async function createBarberAction(
  formData: FormData
): Promise<MutationResult> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (!name || !email || !password) {
    return mutationError("Nome, e-mail e senha sao obrigatorios.");
  }

  if (password.length < 6) {
    return mutationError("A senha deve ter pelo menos 6 caracteres.");
  }

  const [existingUser, existingPendingRegistration] = await Promise.all([
    prisma.user.findFirst({
      where: { email },
    }),
    prisma.pendingRegistration.findFirst({
      where: { email },
    }),
  ]);

  if (existingUser) {
    return mutationError(
      existingUser.isActive
        ? "Ja existe uma conta ativa com esse e-mail."
        : "Ja existe um barbeiro desligado com esse e-mail. Reative a conta existente em vez de criar outra."
    );
  }

  if (existingPendingRegistration) {
    return mutationError(
      "Ja existe um cadastro pendente com esse e-mail. O barbeiro precisa concluir a verificacao antes de um novo convite."
    );
  }

  const code = generateVerificationCode();
  const hashedPassword = await bcrypt.hash(password, 10);
  let pendingCreated = false;

  try {
    await prisma.pendingRegistration.create({
      data: {
        name,
        shopId: admin.shopId || undefined,
        email,
        phone: phone || null,
        passwordHash: hashedPassword,
        role: "BARBER",
        code,
        expiresAt: getExpirationDate(),
        attempts: 0,
      },
    });
    pendingCreated = true;

    await sendVerificationCodeEmail({
      to: email,
      name,
      code,
      verifyUrl: buildVerificationUrl(email),
      accountLabel: "o cadastro de barbeiro",
    });
  } catch (error) {
    if (pendingCreated) {
      await prisma.pendingRegistration.deleteMany({
        where: { email },
      });
    }

    return mutationError(
      error instanceof Error
        ? error.message
        : "Nao foi possivel enviar o convite do barbeiro."
    );
  }

  revalidatePath("/admin/barbeiros");
  return mutationSuccess(
    "Convite enviado. O barbeiro precisa confirmar o e-mail para ativar a conta."
  );
}

export async function toggleBarberStatusAction(
  formData: FormData
): Promise<MutationResult> {
  await requireAdmin();

  const barberId = String(formData.get("barberId") || "");
  const currentActive = String(formData.get("currentActive") || "") === "true";

  if (!barberId) {
    return mutationError("Barbeiro invalido.");
  }

  const barber = await prisma.user.findFirst({
    where: {
      id: barberId,
      role: "BARBER",
    },
    select: {
      id: true,
    },
  });

  if (!barber) {
    return mutationError("Barbeiro nao encontrado.");
  }

  await prisma.user.update({
    where: { id: barberId },
    data: {
      isActive: !currentActive,
    },
  });

  revalidatePath("/admin/barbeiros");
  revalidatePath(`/admin/barbeiros/${barberId}`);
  revalidatePath("/admin/agenda");
  return mutationSuccess(
    currentActive ? "Barbeiro inativado." : "Barbeiro reativado."
  );
}

export async function updateBarberPhotoAction(
  formData: FormData
): Promise<MutationResult | MutationResult<{ image: string }>> {
  await requireAdmin();

  const barberId = String(formData.get("barberId") || "");
  const file = formData.get("photo");

  if (!barberId) {
    return mutationError("Barbeiro invalido.");
  }

  if (!(file instanceof File)) {
    return mutationError("Escolha uma foto para enviar.");
  }

  const barber = await prisma.user.findFirst({
    where: {
      id: barberId,
      role: "BARBER",
    },
    select: {
      id: true,
      image: true,
    },
  });

  if (!barber) {
    return mutationError("Barbeiro nao encontrado.");
  }

  try {
    const image = await saveBarberPhoto(file);

    await prisma.user.update({
      where: {
        id: barber.id,
      },
      data: {
        image,
      },
    });

    await deleteLocalBarberPhoto(barber.image);

    revalidatePath("/admin/barbeiros");
    revalidatePath(`/admin/barbeiros/${barber.id}`);
    revalidatePath("/admin");
    revalidatePath("/agendar");

    return mutationSuccess("Foto do barbeiro atualizada.", { image });
  } catch (error) {
    return mutationError(
      error instanceof Error ? error.message : "Nao foi possivel atualizar a foto."
    );
  }
}

export async function deleteBarberAction(
  formData: FormData
): Promise<MutationResult> {
  await requireAdmin();

  const barberId = String(formData.get("barberId") || "");

  if (!barberId) {
    return mutationError("Barbeiro invalido.");
  }

  const barber = await prisma.user.findFirst({
    where: {
      id: barberId,
      role: "BARBER",
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!barber) {
    return mutationError("Barbeiro nao encontrado.");
  }

  if (!barber.isActive) {
    return mutationSuccess("Esse barbeiro ja esta desligado.", undefined, "info");
  }

  await prisma.user.update({
    where: { id: barberId },
    data: {
      isActive: false,
    },
  });

  revalidatePath("/admin/barbeiros");
  revalidatePath(`/admin/barbeiros/${barberId}`);
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/servicos");
  revalidatePath("/agendar");
  revalidatePath("/meu-perfil");
  return mutationSuccess(
    "Barbeiro desligado com sucesso. Historico, servicos prestados e fechamentos foram preservados."
  );
}

export async function upsertBarberServiceCommissionAction(
  formData: FormData
): Promise<MutationResult> {
  const admin = await requireAdmin();

  const barberId = String(formData.get("barberId") || "").trim();
  const serviceId = String(formData.get("serviceId") || "").trim();
  const commissionType =
    String(formData.get("commissionType") || "PERCENT") === "FIXED" ? "FIXED" : "PERCENT";
  const commissionValue = Number(formData.get("commissionValue") || 0);

  if (
    !barberId ||
    !serviceId ||
    !Number.isFinite(commissionValue) ||
    commissionValue < 0 ||
    (commissionType === "PERCENT" && commissionValue > 100)
  ) {
    return mutationError("Preencha a comissao corretamente.");
  }

  const [barber, service] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: barberId,
        role: "BARBER",
      },
      select: { id: true },
    }),
    prisma.service.findFirst({
      where: {
        id: serviceId,
        OR: [{ barberId }, { barberId: null }],
      },
      select: { id: true },
    }),
  ]);

  if (!barber) {
    return mutationError("Barbeiro nao encontrado.");
  }

  if (!service) {
    return mutationError("Servico nao encontrado para esse barbeiro.");
  }

  await prisma.barberServiceCommission.upsert({
    where: {
      barberId_serviceId: {
        barberId,
        serviceId,
      },
    },
    update: {
      commissionType,
      commissionValue,
    },
    create: {
      shopId: admin.shopId || undefined,
      barberId,
      serviceId,
      commissionType,
      commissionValue,
    },
  });

  revalidatePath("/admin/barbeiros");
  revalidatePath(`/admin/barbeiros/${barberId}`);
  revalidatePath("/admin/financeiro");
  revalidatePath("/barber");
  return mutationSuccess("Comissao do barbeiro atualizada.");
}
