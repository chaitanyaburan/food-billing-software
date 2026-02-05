import dayjs from "dayjs";
import { prisma } from "@/lib/prisma";

export async function nextInvoiceNo(restaurantId: string) {
  // Atomic-ish sequence: use update with increment.
  const updated = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { invoiceSeq: { increment: 1 } },
    select: { invoicePrefix: true, invoiceSeq: true }
  });

  const yyyymm = dayjs().format("YYYYMM");
  const seq = String(updated.invoiceSeq).padStart(6, "0");
  return `${updated.invoicePrefix}-${yyyymm}-${seq}`;
}
