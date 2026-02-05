import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { computeTotals } from "@/lib/billing/gst";
import { nextInvoiceNo } from "@/lib/billing/invoiceNo";

const bodySchema = z.object({
  invoiceType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]),
  tableNo: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        qty: z.number().int().positive(),
        price: z.number().nonnegative()
      })
    )
    .min(1),
  discount: z
    .object({ type: z.enum(["FLAT", "PERCENT"]), value: z.number().nonnegative() })
    .optional(),
  payment: z.object({
    mode: z.enum(["CASH", "UPI", "CARD"]),
    amount: z.number().nonnegative(),
    reference: z.string().optional()
  })
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

    const subtotal = body.items.reduce((sum: number, it: { qty: number; price: number }) => sum + it.qty * it.price, 0);

    const totals = computeTotals({
      subtotal,
      discount: body.discount,
      gstMode: restaurant.gstMode,
      cgstRate: Number(restaurant.cgstRate),
      sgstRate: Number(restaurant.sgstRate),
      igstRate: Number(restaurant.igstRate)
    });

    const invoiceNo = await nextInvoiceNo(ctx.user.restaurantId);

    const created = await p.invoice.create({
      data: {
        restaurantId: ctx.user.restaurantId,
        createdById: ctx.user.sub,
        invoiceNo,
        invoiceType: body.invoiceType,
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
          create: body.items.map((it: { name: string; qty: number; price: number }) => ({
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
      },
      include: { payments: true, items: true }
    });

    return ok({ invoice: created, payments: created.payments, items: created.items });
  } catch (err) {
    return fail(err);
  }
}
