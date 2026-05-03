import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prismaBase: PrismaClient | undefined;
};

export const basePrisma =
  globalForPrisma.prismaBase ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = basePrisma;
}
