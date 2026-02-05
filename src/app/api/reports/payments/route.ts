import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/http/response";

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export async function GET(req: NextRequest) {
  try {
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER"]);

    const url = new URL(req.url);
    const q = querySchema.parse({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined
    });

    const from = q.from ? new Date(q.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = q.to ? new Date(q.to) : new Date();

    const grouped = await prisma.payment.groupBy({
      by: ["mode"],
      where: {
        restaurantId: ctx.user.restaurantId,
        createdAt: { gte: from, lte: to }
      },
      _sum: { amount: true },
      _count: { _all: true }
    });

    return ok({
      range: { from, to },
      modes: grouped.map((g: { mode: string; _count: { _all: number }; _sum: { amount: unknown } }) => ({
        mode: g.mode,
        count: g._count._all,
        amount: Number(g._sum.amount ?? 0)
      }))
    });
  } catch (err) {
    return fail(err);
  }
}
