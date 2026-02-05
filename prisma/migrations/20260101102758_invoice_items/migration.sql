-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "modifiers" JSONB NOT NULL DEFAULT '[]',
    "lineTotal" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceItem_restaurantId_invoiceId_idx" ON "InvoiceItem"("restaurantId", "invoiceId");

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
