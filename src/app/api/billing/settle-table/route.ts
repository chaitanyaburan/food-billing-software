import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { computeTotals } from "@/lib/billing/gst";
import { nextInvoiceNo } from "@/lib/billing/invoiceNo";

const bodySchema = z.object({
  tableNo: z.string().min(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  payment: z.object({
    mode: z.enum(["CASH", "UPI", "CARD"]),
    amount: z.number().nonnegative(),
    reference: z.string().optional()
  }),
  discount: z
    .object({ type: z.enum(["FLAT", "PERCENT"]), value: z.number().nonnegative() })
    .optional()
});

export async function POST(req: NextRequest) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER", "CASHIER"]);

    const body = bodySchema.parse(await req.json());

    const restaurant = await p.restaurant.findUnique({
      where: { id: ctx.user.restaurantId }
    });
    if (!restaurant) throw new Error("RESTAURANT_NOT_FOUND");

    // Bill any non-cancelled orders that are not yet linked to an invoice
    const orders = await p.order.findMany({
      where: {
        restaurantId: ctx.user.restaurantId,
        tableNo: body.tableNo,
        linkedInvoiceId: null,
        status: { not: "CANCELLED" }
      },
      include: { items: true },
      orderBy: { createdAt: "asc" }
    });

    if (!orders.length) throw new Error("NO_OPEN_ORDERS_FOR_TABLE");

    // Aggregate items by nameSnapshot + unit price (basic; can be improved)
    const map = new Map<string, { name: string; qty: number; price: number }>();
    for (const o of orders) {
      for (const it of o.items) {
        const key = `${it.nameSnapshot}@@${Number(it.priceSnapshot)}`;
        const existing = map.get(key);
        if (existing) existing.qty += it.qty;
        else map.set(key, { name: it.nameSnapshot, qty: it.qty, price: Number(it.priceSnapshot) });
      }
    }

    const items = Array.from(map.values());
    const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);

    const totals = computeTotals({
      subtotal,
      discount: body.discount,
      gstMode: restaurant.gstMode,
      cgstRate: Number(restaurant.cgstRate),
      sgstRate: Number(restaurant.sgstRate),
      igstRate: Number(restaurant.igstRate)
    });

    const invoiceNo = await nextInvoiceNo(ctx.user.restaurantId);

    const createdInvoice = await p.invoice.create({
      data: {
        restaurantId: ctx.user.restaurantId,
        createdById: ctx.user.sub,
        invoiceNo,
        invoiceType: "DINE_IN",
        tableNo: body.tableNo,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        subtotal: totals.subtotal,
        discountType: body.discount?.type,
        discountValue: body.discount?.value,
        discountAmount: totals.discountAmount,
        taxable: totals.taxable,
        gstMode: restaurant.gstMode,
        cgstRate: restaurant.cgstRate,
        sgstRate: restaurant.sgstRate,
        igstRate: restaurant.igstRate,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        igstAmount: totals.igstAmount,
        total: totals.total,
        items: {
          create: items.map((it) => ({
            restaurantId: ctx.user.restaurantId,
            nameSnapshot: it.name,
            qty: it.qty,
            unitPrice: it.price,
            modifiers: [],
            lineTotal: it.qty * it.price
          }))
        },
        payments: {
          create: {
            restaurantId: ctx.user.restaurantId,
            mode: body.payment.mode,
            amount: body.payment.amount,
            reference: body.payment.reference
          }
        }
      }
    });

    // Link all orders to this invoice (so table is cleared for next billing)
    await p.order.updateMany({
      where: {
        restaurantId: ctx.user.restaurantId,
        tableNo: body.tableNo,
        linkedInvoiceId: null,
        status: { not: "CANCELLED" }
      },
      data: { linkedInvoiceId: createdInvoice.id }
    });

    return ok({ invoiceId: createdInvoice.id, printPath: `/app/print/invoice/${createdInvoice.id}` });
  } catch (err) {
    return fail(err);
  }
}
