import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { prisma } from "@/lib/prisma";
import { kdsBus } from "@/lib/realtime/kdsBus";

const bodySchema = z.object({
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
    .min(1)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER", "CASHIER"]);

    const body = bodySchema.parse(await req.json());

    // Verify order exists and belongs to restaurant, and is not completed/cancelled
    const order = await p.order.findFirst({
      where: { 
        id: params.id, 
        restaurantId: ctx.user.restaurantId,
        status: { notIn: ["COMPLETED", "CANCELLED"] }
      },
      include: { items: true }
    });

    if (!order) {
      return fail(new Error("ORDER_NOT_FOUND_OR_LOCKED"));
    }

    // Add new items to the order
    await p.orderItem.createMany({
      data: body.items.map((it) => ({
        orderId: order.id,
        menuItemId: it.menuItemId,
        nameSnapshot: it.nameSnapshot,
        priceSnapshot: it.priceSnapshot,
        qty: it.qty,
        modifiers: it.modifiers ?? [],
        notes: it.notes
      }))
    });

    // Fetch updated order
    const updated = await p.order.findFirst({
      where: { id: params.id, restaurantId: ctx.user.restaurantId },
      include: { items: true }
    });

    // Notify KDS
    if (updated) {
      kdsBus.publish({
        type: "ORDER_UPDATED",
        restaurantId: ctx.user.restaurantId,
        orderId: String(updated.id),
        status: updated.status
      });
    }

    return ok({ order: updated });
  } catch (err) {
    return fail(err);
  }
}
