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

    const invoices = await prisma.invoice.aggregate({
      where: {
        restaurantId: ctx.user.restaurantId,
        createdAt: { gte: from, lte: to }
      },
      _sum: {
        taxable: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true
      },
      _count: { _all: true }
    });

    return ok({
      range: { from, to },
      count: invoices._count._all,
      taxable: Number(invoices._sum.taxable ?? 0),
      cgst: Number(invoices._sum.cgstAmount ?? 0),
      sgst: Number(invoices._sum.sgstAmount ?? 0),
      igst: Number(invoices._sum.igstAmount ?? 0)
    });
  } catch (err) {
    return fail(err);
  }
}
