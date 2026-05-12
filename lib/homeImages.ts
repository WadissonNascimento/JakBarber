import "server-only";
import { randomUUID } from "crypto";
import sharp from "sharp";

const MAX_HOME_IMAGE_SIZE = 3 * 1024 * 1024;
const MAX_HOME_IMAGE_DIMENSION = 1800;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getStorageConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para enviar imagens."
    );
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    serviceRoleKey,
    bucket,
  };
}

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function buildPublicUrl(supabaseUrl: string, bucket: string, imagePath: string) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeStoragePath(
    imagePath
  )}`;
}

function hasAllowedImageSignature(buffer: Buffer, type: string) {
  if (type === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (type === "image/png") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }

  if (type === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

async function getValidatedHomeImageBuffer(file: File) {
  if (!file || file.size === 0) {
    throw new Error("Selecione uma imagem para enviar.");
  }

  if (file.size > MAX_HOME_IMAGE_SIZE) {
    throw new Error("A imagem deve ter no maximo 3MB.");
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!hasAllowedImageSignature(buffer, file.type)) {
    throw new Error("O arquivo enviado nao parece ser uma imagem valida.");
  }

  return buffer;
}

async function processHomeImageBuffer(buffer: Buffer) {
  return sharp(buffer, { failOn: "none" })
    .rotate()
    .resize(MAX_HOME_IMAGE_DIMENSION, MAX_HOME_IMAGE_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 84 })
    .toBuffer();
}

export async function uploadHomeImage(file: File) {
  const { supabaseUrl, serviceRoleKey, bucket } = getStorageConfig();
  const buffer = await getValidatedHomeImageBuffer(file);
  const processedBuffer = await processHomeImageBuffer(buffer);
  const imagePath = `home/${Date.now()}-${randomUUID()}.webp`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeStoragePath(
    imagePath
  )}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Cache-Control": "31536000",
      "Content-Type": "image/webp",
      "x-upsert": "false",
    },
    body: new Uint8Array(processedBuffer),
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel enviar a imagem para o Supabase Storage.");
  }

  return {
    imagePath,
    imageUrl: buildPublicUrl(supabaseUrl, bucket, imagePath),
  };
}

export async function deleteHomeImage(imagePath: string | null | undefined) {
  if (!imagePath?.startsWith("home/")) {
    return;
  }

  const { supabaseUrl, serviceRoleKey, bucket } = getStorageConfig();
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prefixes: [imagePath],
    }),
  });

  if (!response.ok) {
    console.warn("[storage] Nao foi possivel excluir imagem antiga da home.");
  }
}
