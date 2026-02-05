/*
  Warnings:

  - A unique constraint covering the columns `[publicToken]` on the table `RestaurantTable` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InvoiceDeliveryChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "InvoiceDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_createdByUserId_fkey";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "createdByUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RestaurantTable" ADD COLUMN     "publicToken" TEXT;

-- CreateTable
CREATE TABLE "InvoiceDelivery" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "channel" "InvoiceDeliveryChannel" NOT NULL,
    "status" "InvoiceDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "toPhone" TEXT,
    "toEmail" TEXT,
    "message" TEXT,
    "provider" TEXT,
    "providerRef" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "InvoiceDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceDelivery_restaurantId_createdAt_idx" ON "InvoiceDelivery"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "InvoiceDelivery_invoiceId_idx" ON "InvoiceDelivery"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceDelivery_restaurantId_status_idx" ON "InvoiceDelivery"("restaurantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_publicToken_key" ON "RestaurantTable"("publicToken");

-- AddForeignKey
ALTER TABLE "InvoiceDelivery" ADD CONSTRAINT "InvoiceDelivery_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
