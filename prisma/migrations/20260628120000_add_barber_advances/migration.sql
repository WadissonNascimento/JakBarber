CREATE TABLE "BarberAdvance" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL DEFAULT 'shop_jak_barber',
    "barberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "advanceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarberAdvance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BarberAdvance_id_shopId_key" ON "BarberAdvance"("id", "shopId");
CREATE INDEX "BarberAdvance_shopId_barberId_advanceDate_idx" ON "BarberAdvance"("shopId", "barberId", "advanceDate");
CREATE INDEX "BarberAdvance_shopId_advanceDate_idx" ON "BarberAdvance"("shopId", "advanceDate");

ALTER TABLE "BarberAdvance" ADD CONSTRAINT "BarberAdvance_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BarberAdvance" ADD CONSTRAINT "BarberAdvance_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
