"use client";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_SOURCE_IMAGE_SIZE = 8 * 1024 * 1024;
const OUTPUT_IMAGE_SIZE = 1200;
const TARGET_PRODUCT_FILL = 0.94;
const EDGE_ALPHA_THRESHOLD = 18;
const EDGE_COLOR_THRESHOLD = 34;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const HEIC_IMAGE_TYPES = new Set(["image/heic", "image/heif"]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const HEIC_IMAGE_EXTENSIONS = new Set(["heic", "heif"]);
const IMAGE_TYPE_MESSAGE = "Envie uma imagem JPG, PNG, WEBP ou HEIC.";
const INVALID_IMAGE_MESSAGE =
  "O arquivo enviado nao parece ser uma imagem valida. Envie JPG, PNG, WEBP ou HEIC.";

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

function validateProductImage(file: File) {
  const mimeType = normalizeMimeType(file.type);
  const extension = getExtension(file.name);

  if (
    !(
      (mimeType && (ALLOWED_IMAGE_TYPES.has(mimeType) || HEIC_IMAGE_TYPES.has(mimeType))) ||
      (extension && ALLOWED_IMAGE_EXTENSIONS.has(extension))
    )
  ) {
    throw new Error(IMAGE_TYPE_MESSAGE);
  }
}

function isHeicImage(file: File) {
  const mimeType = normalizeMimeType(file.type);
  const extension = getExtension(file.name);

  return (
    HEIC_IMAGE_TYPES.has(mimeType) ||
    Boolean(extension && HEIC_IMAGE_EXTENSIONS.has(extension))
  );
}

function validateSourceSize(file: File) {
  if (file.size > MAX_SOURCE_IMAGE_SIZE) {
    throw new Error("A imagem deve ter no maximo 8MB.");
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });
}

async function compressCanvasToProductBlob(canvas: HTMLCanvasElement) {
  const qualities = [0.92, 0.86, 0.8, 0.72, 0.64];

  for (const quality of qualities) {
    const blob = await canvasToBlob(canvas, quality);

    if (blob && blob.size <= MAX_IMAGE_SIZE) {
      return blob;
    }
  }

  return canvasToBlob(canvas, 0.56);
}

function getBackgroundReference(data: Uint8ClampedArray, width: number, height: number) {
  const samplePoints = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)],
    [width - 1, Math.floor(height / 2)],
  ];

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let totalA = 0;

  for (const [x, y] of samplePoints) {
    const index = (y * width + x) * 4;
    totalR += data[index] ?? 255;
    totalG += data[index + 1] ?? 255;
    totalB += data[index + 2] ?? 255;
    totalA += data[index + 3] ?? 255;
  }

  const count = samplePoints.length;

  return {
    r: totalR / count,
    g: totalG / count,
    b: totalB / count,
    a: totalA / count,
  };
}

function colorDistance(
  red: number,
  green: number,
  blue: number,
  background: { r: number; g: number; b: number }
) {
  return Math.sqrt(
    (red - background.r) ** 2 +
      (green - background.g) ** 2 +
      (blue - background.b) ** 2
  );
}

function isBackgroundLike(
  data: Uint8ClampedArray,
  index: number,
  background: { r: number; g: number; b: number }
) {
  const alpha = data[index + 3] ?? 255;

  if (alpha < EDGE_ALPHA_THRESHOLD) {
    return true;
  }

  const red = data[index] ?? 255;
  const green = data[index + 1] ?? 255;
  const blue = data[index + 2] ?? 255;

  return colorDistance(red, green, blue, background) <= EDGE_COLOR_THRESHOLD;
}

function getContentBounds(bitmap: ImageBitmap) {
  const probeCanvas = document.createElement("canvas");
  probeCanvas.width = bitmap.width;
  probeCanvas.height = bitmap.height;

  const context = probeCanvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return {
      left: 0,
      top: 0,
      width: bitmap.width,
      height: bitmap.height,
    };
  }

  context.drawImage(bitmap, 0, 0);

  const { data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height);
  const background = getBackgroundReference(data, width, height);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    const flatIndex = y * width + x;

    if (visited[flatIndex]) {
      return;
    }

    const pixelIndex = flatIndex * 4;

    if (!isBackgroundLike(data, pixelIndex, background)) {
      return;
    }

    visited[flatIndex] = 1;
    queue[tail] = flatIndex;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (head < tail) {
    const flatIndex = queue[head];
    head += 1;

    const x = flatIndex % width;
    const y = Math.floor(flatIndex / width);

    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const flatIndex = y * width + x;
      if (visited[flatIndex]) {
        continue;
      }

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX === -1 || maxY === -1) {
    return {
      left: 0,
      top: 0,
      width: bitmap.width,
      height: bitmap.height,
    };
  }

  const padding = Math.max(18, Math.round(Math.max(width, height) * 0.04));
  const left = Math.max(0, minX - padding);
  const top = Math.max(0, minY - padding);
  const right = Math.min(width, maxX + padding);
  const bottom = Math.min(height, maxY + padding);

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function drawMarketplaceBackground(
  context: CanvasRenderingContext2D,
  size: number
) {
  context.fillStyle = "#eef2f7";
  context.fillRect(0, 0, size, size);

  const glow = context.createRadialGradient(
    size * 0.5,
    size * 0.46,
    size * 0.08,
    size * 0.5,
    size * 0.5,
    size * 0.5
  );
  glow.addColorStop(0, "rgba(255,255,255,0.2)");
  glow.addColorStop(0.62, "rgba(255,255,255,0.06)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, size, size);
}

function drawStandardizedProduct(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  bounds: { left: number; top: number; width: number; height: number },
  size: number
) {
  const maxBox = size * TARGET_PRODUCT_FILL;
  const scale = Math.min(maxBox / bounds.width, maxBox / bounds.height);
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  const x = Math.round((size - width) / 2);
  const y = Math.round((size - height) / 2);

  context.drawImage(
    bitmap,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    x,
    y,
    width,
    height
  );
}

export async function prepareProductImageUpload(file: File) {
  validateProductImage(file);
  validateSourceSize(file);

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (isHeicImage(file)) {
      return {
        file,
        previewUrl: URL.createObjectURL(file),
      };
    }

    throw new Error(INVALID_IMAGE_MESSAGE);
  }
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_IMAGE_SIZE;
  canvas.height = OUTPUT_IMAGE_SIZE;

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    return {
      file,
      previewUrl: URL.createObjectURL(file),
    };
  }

  const bounds = getContentBounds(bitmap);
  drawMarketplaceBackground(context, OUTPUT_IMAGE_SIZE);
  drawStandardizedProduct(context, bitmap, bounds, OUTPUT_IMAGE_SIZE);
  bitmap.close();

  const blob = await compressCanvasToProductBlob(canvas);
  const uploadFile =
    blob && blob.size <= MAX_IMAGE_SIZE
      ? new File([blob], "image.webp", { type: "image/webp" })
      : file;

  if (uploadFile.size > MAX_IMAGE_SIZE) {
    throw new Error("A imagem comprimida ainda ficou acima de 2MB.");
  }

  return {
    file: uploadFile,
    previewUrl: URL.createObjectURL(uploadFile),
  };
}

export async function prepareSecondaryProductImageUpload(file: File) {
  validateProductImage(file);
  validateSourceSize(file);

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (isHeicImage(file)) {
      return {
        file,
        previewUrl: URL.createObjectURL(file),
      };
    }

    throw new Error(INVALID_IMAGE_MESSAGE);
  }
  const canvas = document.createElement("canvas");
  const maxSize = OUTPUT_IMAGE_SIZE;
  const scale = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);

  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    return {
      file,
      previewUrl: URL.createObjectURL(file),
    };
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await compressCanvasToProductBlob(canvas);
  const uploadFile =
    blob && blob.size <= MAX_IMAGE_SIZE
      ? new File([blob], "image.webp", { type: "image/webp" })
      : file;

  if (uploadFile.size > MAX_IMAGE_SIZE) {
    throw new Error("A imagem comprimida ainda ficou acima de 2MB.");
  }

  return {
    file: uploadFile,
    previewUrl: URL.createObjectURL(uploadFile),
  };
}

