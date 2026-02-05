import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { prisma } from "@/lib/prisma";
import { kdsBus } from "@/lib/realtime/kdsBus";

const createSchema = z.object({
  type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]),
  tableNo: z.string().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        nameSnapshot: z.string().min(1),
        priceSnapshot: z.number().nonnegative(),
        qty: z.number().int().positive(),
        modifiers: z
          .array(z.object({ name: z.string().min(1), priceDelta: z.number() }))
          .optional(),
        notes: z.string().optional()
      })
    )
    .min(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER", "CASHIER"]);
    const body = createSchema.parse(await req.json());

    const created = await p.order.create({
      data: {
        restaurantId: ctx.user.restaurantId,
        createdByUserId: ctx.user.sub,
        type: body.type,
        tableNo: body.tableNo,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        deliveryAddress: body.deliveryAddress,
        items: {
          create: body.items.map((it) => ({
            menuItemId: it.menuItemId,
            nameSnapshot: it.nameSnapshot,
            priceSnapshot: it.priceSnapshot,
            qty: it.qty,
            modifiers: it.modifiers ?? [],
            notes: it.notes
          }))
        }
      },
      include: { items: true }
    });

    kdsBus.publish({
      type: "ORDER_CREATED",
      restaurantId: ctx.user.restaurantId,
      orderId: String(created.id)
    });

    return ok({ order: created });
  } catch (err) {
    return fail(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER", "CASHIER", "KITCHEN"]);

    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const tableNo = url.searchParams.get("tableNo");

    const orders = await p.order.findMany({
      where: {
        restaurantId: ctx.user.restaurantId,
        ...(status ? { status } : {}),
        ...(tableNo ? { tableNo } : {})
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    return ok({ orders });
  } catch (err) {
    return fail(err);
  }
}
