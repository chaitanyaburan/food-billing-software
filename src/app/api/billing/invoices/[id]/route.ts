import { NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/http/response";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER", "CASHIER"]);

    const invoice = await p.invoice.findFirst({
      where: { id: params.id, restaurantId: ctx.user.restaurantId },
      include: {
        payments: true,
        items: { orderBy: { createdAt: "asc" } },
        restaurant: true
      }
    });

    if (!invoice) throw new Error("INVOICE_NOT_FOUND");

    return ok({ invoice });
  } catch (err) {
    return fail(err);
  }
}
