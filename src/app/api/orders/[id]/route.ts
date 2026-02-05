import { NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER", "CASHIER", "KITCHEN"]);

    const order = await p.order.findFirst({
      where: {
        id: params.id,
        restaurantId: ctx.user.restaurantId
      },
      include: { items: true }
    });

    if (!order) {
      return fail(new Error("ORDER_NOT_FOUND"));
    }

    return ok({ order });
  } catch (err) {
    return fail(err);
  }
}
