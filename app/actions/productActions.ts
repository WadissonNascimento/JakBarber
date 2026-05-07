"use server";

import { ProductCategory } from "@prisma/client";
import { auth } from "@/auth";
import { registerStockMovement } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { isProductCategoryValue } from "@/lib/productCategories";
import { revalidatePath } from "next/cache";
import {
  deleteProductImage,
  normalizeProductImageUrl,
  uploadProductImage,
} from "@/lib/productImages";

async function ensureProductAccess() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Nao autorizado.");
  }

  return session.user;
}

function revalidateProductViews() {
  revalidatePath("/produtos");
  revalidatePath("/loja");
  revalidatePath("/carrinho");
  revalidatePath("/admin");
  revalidatePath("/admin/produtos");
  revalidatePath("/admin/produtos/novo");
  revalidatePath("/agendar");
  revalidatePath("/customer/agendamentos");
  revalidatePath("/barber");
  revalidatePath("/barber/agenda");
}

function parseProductCategory(value: string) {
  return isProductCategoryValue(value) ? value : ProductCategory.OTHER;
}

export async function createProduct(data: {
  name: string;
  description?: string;
  category?: ProductCategory;
  price: number;
  imageUrl?: string;
  stock: number;
}) {
  const admin = await ensureProductAccess();

  const name = data.name.trim();
  const price = Number(data.price);
  const stock = Number(data.stock);

  if (!name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
    throw new Error("Preencha nome, preco e estoque corretamente.");
  }

  const product = await prisma.product.create({
    data: {
      shopId: admin.shopId || undefined,
      name,
      description: data.description?.trim() || null,
      category: data.category || ProductCategory.OTHER,
      price,
      imageUrl: normalizeProductImageUrl(data.imageUrl?.trim() || null),
      stock,
    },
  });

  await registerStockMovement({
    shopId: admin.shopId || undefined,
    productId: product.id,
    type: "IN",
    quantity: stock,
    reason: "Cadastro inicial do produto",
  });

  revalidateProductViews();
  return product;
}

export async function createProductFromForm(formData: FormData) {
  const admin = await ensureProductAccess();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const category = parseProductCategory(String(formData.get("category") || ""));
  const price = Number(formData.get("price") || 0);
  const stock = Number(formData.get("stock") || 0);
  const imageFile = formData.get("image");

  if (
    !name ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    throw new Error("Preencha nome, preco e estoque corretamente.");
  }

  const product = await prisma.product.create({
    data: {
      shopId: admin.shopId || undefined,
      name,
      description: description || null,
      category,
      price,
      stock,
    },
  });

  try {
    if (imageFile instanceof File && imageFile.size > 0) {
      const image = await uploadProductImage({
        productId: product.id,
        file: imageFile,
      });

      await prisma.product.update({
        where: { id: product.id },
        data: {
          imageUrl: image.imageUrl,
          imagePath: image.imagePath,
        },
      });
    }

      await registerStockMovement({
        shopId: admin.shopId || undefined,
        productId: product.id,
      type: "IN",
      quantity: stock,
      reason: "Cadastro inicial do produto",
    });
  } catch (error) {
    await prisma.product.delete({ where: { id: product.id } }).catch(() => undefined);
    throw error;
  }

  revalidateProductViews();
  return product;
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    category: ProductCategory;
    price: number;
    imageUrl: string | null;
    stock: number;
    isActive: boolean;
  }>
) {
  await ensureProductAccess();

  const currentProduct = await prisma.product.findUnique({
    where: { id },
  });

  if (!currentProduct) {
    throw new Error("Produto nao encontrado.");
  }

  if (
    (typeof data.name === "string" && !data.name.trim()) ||
    (typeof data.price === "number" && (!Number.isFinite(data.price) || data.price <= 0)) ||
    (typeof data.stock === "number" &&
      (!Number.isInteger(data.stock) || data.stock < 0))
  ) {
    throw new Error("Dados de produto invalidos.");
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...data,
      name: data.name?.trim(),
      category: data.category,
      imageUrl:
        data.imageUrl === undefined
          ? undefined
          : normalizeProductImageUrl(data.imageUrl),
    },
  });

  if (typeof data.stock === "number" && data.stock !== currentProduct.stock) {
    const difference = data.stock - currentProduct.stock;

    await registerStockMovement({
      productId: id,
      type: difference > 0 ? "ADJUST_IN" : "ADJUST_OUT",
      quantity: Math.abs(difference),
      reason: "Ajuste manual de estoque",
    });
  }

  revalidateProductViews();
  return product;
}

export async function updateProductFromForm(formData: FormData) {
  const admin = await ensureProductAccess();

  const productId = String(formData.get("productId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const category = parseProductCategory(String(formData.get("category") || ""));
  const price = Number(formData.get("price") || 0);
  const stock = Number(formData.get("stock") || 0);

  if (
    !productId ||
    !name ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    throw new Error("Preencha nome, categoria, preco e estoque corretamente.");
  }

  await updateProduct(productId, {
    name,
    description: description || null,
    category,
    price,
    stock,
  });

  return {
    message: "Produto atualizado com sucesso.",
  };
}

export async function updateProductImage(formData: FormData) {
  await ensureProductAccess();

  const productId = String(formData.get("productId") || "");
  const imageFile = formData.get("image");

  if (!productId || !(imageFile instanceof File) || imageFile.size === 0) {
    throw new Error("Selecione uma imagem para enviar.");
  }

  const currentProduct = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      imagePath: true,
    },
  });

  if (!currentProduct) {
    throw new Error("Produto nao encontrado.");
  }

  const image = await uploadProductImage({
    productId: currentProduct.id,
    file: imageFile,
  });

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        imageUrl: image.imageUrl,
        imagePath: image.imagePath,
      },
    });
  } catch (error) {
    await deleteProductImage(image.imagePath);
    throw error;
  }

  await deleteProductImage(currentProduct.imagePath);
  revalidateProductViews();

  return image;
}

export async function deleteProduct(id: string) {
  await ensureProductAccess();

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      imagePath: true,
    },
  });

  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  await prisma.product.delete({
    where: { id },
  });

  await deleteProductImage(product.imagePath);
  revalidateProductViews();
  return {
    deleted: true,
    message: "Produto excluido com sucesso.",
  };
}

export async function toggleProduct(id: string) {
  await ensureProductAccess();

  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: {
      isActive: !product.isActive,
    },
  });

  revalidateProductViews();
  return updatedProduct;
}
