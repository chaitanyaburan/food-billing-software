-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "GstMode" AS ENUM ('CGST_SGST', 'IGST');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isGstRegistered" BOOLEAN NOT NULL DEFAULT false,
    "gstin" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "gstMode" "GstMode" NOT NULL DEFAULT 'CGST_SGST',
    "cgstRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sgstRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "igstRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceSeq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceType" "InvoiceType" NOT NULL,
    "tableNo" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "discountType" TEXT,
    "discountValue" DECIMAL(65,30),
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxable" DECIMAL(65,30) NOT NULL,
    "gstMode" "GstMode" NOT NULL,
    "cgstRate" DECIMAL(65,30) NOT NULL,
    "sgstRate" DECIMAL(65,30) NOT NULL,
    "igstRate" DECIMAL(65,30) NOT NULL,
    "cgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "isVeg" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "modifiers" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantTable" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableNo" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "tableNo" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "deliveryAddress" TEXT,
    "linkedInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "priceSnapshot" DECIMAL(65,30) NOT NULL,
    "qty" INTEGER NOT NULL,
    "modifiers" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_refreshToken_key" ON "UserSession"("refreshToken");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "Invoice_restaurantId_createdAt_idx" ON "Invoice"("restaurantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_restaurantId_invoiceNo_key" ON "Invoice"("restaurantId", "invoiceNo");

-- CreateIndex
CREATE INDEX "Payment_restaurantId_createdAt_idx" ON "Payment"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Category_restaurantId_sortOrder_idx" ON "Category"("restaurantId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Category_restaurantId_name_key" ON "Category"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "MenuItem_restaurantId_categoryId_idx" ON "MenuItem"("restaurantId", "categoryId");

-- CreateIndex
CREATE INDEX "MenuItem_restaurantId_isEnabled_idx" ON "MenuItem"("restaurantId", "isEnabled");

-- CreateIndex
CREATE INDEX "RestaurantTable_restaurantId_isEnabled_idx" ON "RestaurantTable"("restaurantId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_restaurantId_tableNo_key" ON "RestaurantTable"("restaurantId", "tableNo");

-- CreateIndex
CREATE INDEX "Order_restaurantId_createdAt_idx" ON "Order"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_restaurantId_status_idx" ON "Order"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "AuditLog_restaurantId_createdAt_idx" ON "AuditLog"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_restaurantId_action_idx" ON "AuditLog"("restaurantId", "action");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
