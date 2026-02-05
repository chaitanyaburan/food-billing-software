import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isEnabled: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER"]);

    const body = createSchema.parse(await req.json());

    const created = await p.category.create({
      data: {
        restaurantId: ctx.user.restaurantId,
        name: body.name,
        sortOrder: body.sortOrder ?? 0,
        isEnabled: body.isEnabled ?? true
      }
    });

    return ok({ category: created });
  } catch (err) {
    return fail(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER", "CASHIER", "KITCHEN"]);

    const categories = await p.category.findMany({
      where: { restaurantId: ctx.user.restaurantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });

    return ok({ categories });
  } catch (err) {
    return fail(err);
  }
}
