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

type DayRow = {
  date: string;
  count: number;
  subtotal: number;
  discountAmount: number;
  tax: number;
  total: number;
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

    const invoices = await prisma.invoice.findMany({
      where: {
        restaurantId: ctx.user.restaurantId,
        createdAt: { gte: from, lte: to }
      },
      select: {
        createdAt: true,
        subtotal: true,
        discountAmount: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        total: true
      },
      orderBy: { createdAt: "asc" },
      take: 5000
    });

    const byDay = new Map<string, DayRow>();

    for (const inv of invoices) {
      const key = inv.createdAt.toISOString().slice(0, 10);
      const existing = byDay.get(key) ?? {
        date: key,
        count: 0,
        subtotal: 0,
        discountAmount: 0,
        tax: 0,
        total: 0
      };
      const taxAmount =
        Number(inv.cgstAmount ?? 0) + Number(inv.sgstAmount ?? 0) + Number(inv.igstAmount ?? 0);
      existing.count += 1;
      existing.subtotal += Number(inv.subtotal ?? 0);
      existing.discountAmount += Number(inv.discountAmount ?? 0);
      existing.tax += taxAmount;
      existing.total += Number(inv.total ?? 0);
      byDay.set(key, existing);
    }

    const rows = Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

    if (q.format === "csv") {
      const header =
        "Date,Invoices,Subtotal,Discount,Tax,Total\n";
      const lines = rows.map(
        (r) =>
          `${r.date},${r.count},${r.subtotal.toFixed(2)},${r.discountAmount.toFixed(
            2
          )},${r.tax.toFixed(2)},${r.total.toFixed(2)}`
      );
      const csv = [header, ...lines].join("\n");
      return new Response(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="daily-sales-${from.toISOString().slice(0,10)}-to-${to
            .toISOString()
            .slice(0, 10)}.csv"`
        }
      });
    }

    return ok({
      range: { from, to },
      days: rows
    });
  } catch (err) {
    return fail(err);
  }
}

