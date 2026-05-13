import "server-only";
import { randomUUID } from "crypto";
import { normalizeProductImageUrl } from "@/lib/productImageUrl";
import { processProductImageBuffer } from "@/lib/productImagePipeline";

const MAX_PRODUCT_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const VALID_IMAGE_MESSAGE =
  "O arquivo enviado nao parece ser uma imagem valida. Envie JPG, PNG ou WEBP.";
const IMAGE_TYPE_MESSAGE = "Envie uma imagem JPG, PNG ou WEBP.";
const UNSUPPORTED_IMAGE_EXTENSIONS = new Set(["heic", "heif"]);

export { normalizeProductImageUrl };

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

function getExtension(fileName: string | undefined) {
  return String(fileName || "")
    .split(".")
    .pop()
    ?.trim()
    .toLowerCase();
}

function normalizeMimeType(type: string | undefined) {
  const normalized = String(type || "").trim().toLowerCase();

  return normalized === "image/jpg" ? "image/jpeg" : normalized;
}

function inferAllowedImageType(buffer: Buffer) {
  if (hasAllowedImageSignature(buffer, "image/jpeg")) {
    return "image/jpeg";
  }

  if (hasAllowedImageSignature(buffer, "image/png")) {
    return "image/png";
  }

  if (hasAllowedImageSignature(buffer, "image/webp")) {
    return "image/webp";
  }

  return null;
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

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function buildPublicUrl(supabaseUrl: string, bucket: string, imagePath: string) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeStoragePath(
    imagePath
  )}`;
}

function normalizeStorageSegment(value: string | null | undefined) {
  return (value || "default").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function logProductImageFailure(stage: string, file: File, error: unknown) {
  console.warn("[product-image] Falha no upload do produto", {
    stage,
    fileName: file.name || "(sem nome)",
    mime: file.type || "(sem mime)",
    extension: getExtension(file.name) || "(sem extensao)",
    size: file.size,
    error: error instanceof Error ? error.message : String(error),
  });
}

async function getValidatedImageBuffer(file: File) {
  if (!file || file.size === 0) {
    throw new Error("Selecione uma imagem para enviar.");
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
    throw new Error("A imagem deve ter no maximo 2MB.");
  }

  const declaredType = normalizeMimeType(file.type);
  const extension = getExtension(file.name);

  if (
    (declaredType && ["image/heic", "image/heif"].includes(declaredType)) ||
    (extension && UNSUPPORTED_IMAGE_EXTENSIONS.has(extension))
  ) {
    throw new Error(IMAGE_TYPE_MESSAGE);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const inferredType = inferAllowedImageType(buffer);

  if (!inferredType) {
    throw new Error(VALID_IMAGE_MESSAGE);
  }

  if (
    declaredType &&
    !ALLOWED_IMAGE_TYPES.has(declaredType) &&
    declaredType !== "application/octet-stream"
  ) {
    throw new Error(IMAGE_TYPE_MESSAGE);
  }

  return {
    buffer,
    mimeType: inferredType,
  };
}

export async function uploadProductImage({
  productId,
  shopId,
  file,
}: {
  productId: string;
  shopId?: string | null;
  file: File;
}) {
  const { supabaseUrl, serviceRoleKey, bucket } = getStorageConfig();
  let stage = "validacao";

  try {
    const { buffer, mimeType } = await getValidatedImageBuffer(file);
    stage = "processamento";
    const processed = await processProductImageBuffer(buffer, mimeType);
    const extension = processed.extension;
    const imagePath = `products/${normalizeStorageSegment(shopId)}/${productId}/${randomUUID()}.${extension}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeStoragePath(
      imagePath
    )}`;

    stage = "storage";
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Cache-Control": "31536000",
        "Content-Type": processed.mimeType,
        "x-upsert": "false",
      },
      body: new Uint8Array(processed.buffer),
    });

    if (!response.ok) {
      throw new Error("Nao foi possivel enviar a imagem para o Supabase Storage.");
    }

    return {
      imagePath,
      imageUrl: buildPublicUrl(supabaseUrl, bucket, imagePath),
    };
  } catch (error) {
    logProductImageFailure(stage, file, error);
    throw error instanceof Error ? error : new Error(VALID_IMAGE_MESSAGE);
  }
}

export async function deleteProductImage(imagePath: string | null | undefined) {
  if (!imagePath?.startsWith("products/")) {
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
    console.warn("[storage] Nao foi possivel excluir imagem antiga do produto.");
  }
}
