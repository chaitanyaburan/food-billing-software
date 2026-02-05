-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "subcategoryId" TEXT;

-- CreateTable
CREATE TABLE "Subcategory" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subcategory_restaurantId_categoryId_sortOrder_idx" ON "Subcategory"("restaurantId", "categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "Subcategory_categoryId_idx" ON "Subcategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_restaurantId_categoryId_name_key" ON "Subcategory"("restaurantId", "categoryId", "name");

-- CreateIndex
CREATE INDEX "MenuItem_restaurantId_subcategoryId_idx" ON "MenuItem"("restaurantId", "subcategoryId");

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
