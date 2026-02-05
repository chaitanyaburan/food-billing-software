import { NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { prisma } from "@/lib/prisma";
import { kdsBus } from "@/lib/realtime/kdsBus";

export async function DELETE(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER", "CASHIER"]);

    // Verify order exists and belongs to restaurant, and is not completed/cancelled
    const order = await p.order.findFirst({
      where: { 
        id: params.id, 
        restaurantId: ctx.user.restaurantId,
        status: { notIn: ["COMPLETED", "CANCELLED"] }
      }
    });

    if (!order) {
      return fail(new Error("ORDER_NOT_FOUND_OR_LOCKED"));
    }

    // Delete the order item
    await p.orderItem.deleteMany({
      where: {
        id: params.itemId,
        orderId: params.id
      }
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
