import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { prisma } from "@/lib/prisma";
import { kdsBus } from "@/lib/realtime/kdsBus";

const bodySchema = z.object({
  status: z.enum(["PLACED", "PREPARING", "READY", "COMPLETED", "CANCELLED"])
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER", "CASHIER", "KITCHEN"]);

    const body = bodySchema.parse(await req.json());

    await p.order.updateMany({
      where: { id: params.id, restaurantId: ctx.user.restaurantId },
      data: { status: body.status }
    });

    const updated = await p.order.findFirst({
      where: { id: params.id, restaurantId: ctx.user.restaurantId }
    });

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
