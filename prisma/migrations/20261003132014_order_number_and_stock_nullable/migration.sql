/*
  Warnings:

  - You are about to drop the column `orderNo` on the `sales_orders` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderNumber]` on the table `sales_orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderNumber` to the `sales_orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "sales_orders_orderNo_key";

-- AlterTable
ALTER TABLE "sales_orders" DROP COLUMN "orderNo",
ADD COLUMN     "orderNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "stocks" ALTER COLUMN "colorId" DROP NOT NULL,
ALTER COLUMN "sizeId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_orderNumber_key" ON "sales_orders"("orderNumber");
