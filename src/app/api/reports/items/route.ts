import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/http/response";

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  format: z.enum(["json", "csv"]).optional()
});

type ItemRow = {
  name: string;
  qty: number;
  amount: number;
};

export async function GET(req: NextRequest) {
  try {
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER"]);

    const url = new URL(req.url);
    const q = querySchema.parse({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      format: (url.searchParams.get("format") as "json" | "csv" | null) ?? undefined
    });

    const from = q.from ? new Date(q.from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = q.to ? new Date(q.to) : new Date();

    const items = await prisma.invoiceItem.findMany({
      where: {
        restaurantId: ctx.user.restaurantId,
        invoice: {
          createdAt: { gte: from, lte: to }
        }
      },
      select: {
        nameSnapshot: true,
        qty: true,
        lineTotal: true
      },
      take: 10000
    });

    const byName = new Map<string, ItemRow>();
    for (const it of items) {
      const key = it.nameSnapshot;
      const existing = byName.get(key) ?? { name: key, qty: 0, amount: 0 };
      existing.qty += it.qty;
      existing.amount += Number(it.lineTotal ?? 0);
      byName.set(key, existing);
    }

    const rows = Array.from(byName.values()).sort((a, b) =>
      a.amount === b.amount ? (a.name < b.name ? -1 : 1) : b.amount - a.amount
    );

    if (q.format === "csv") {
      const header = "Item,Quantity,Amount\n";
      const lines = rows.map(
        (r) => `${JSON.stringify(r.name)},${r.qty},${r.amount.toFixed(2)}`
      );
      const csv = [header, ...lines].join("\n");
      return new Response(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="item-sales-${from.toISOString().slice(0,10)}-to-${to
            .toISOString()
            .slice(0, 10)}.csv"`
        }
      });
    }

    return ok({
      range: { from, to },
      items: rows
    });
  } catch (err) {
    return fail(err);
  }
}

