import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  categoryId: z.string().min(1),
  subcategoryId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  isVeg: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  modifiers: z
    .array(z.object({ name: z.string().min(1), priceDelta: z.number() }))
    .optional()
});

export async function POST(req: NextRequest) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER"]);

    const body = createSchema.parse(await req.json());

    const created = await p.menuItem.create({
      data: {
        restaurantId: ctx.user.restaurantId,
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId || null,
        name: body.name,
        description: body.description,
        price: body.price,
        isVeg: body.isVeg ?? false,
        isEnabled: body.isEnabled ?? true,
        modifiers: body.modifiers ?? []
      }
    });

    return ok({ item: created });
  } catch (err) {
    return fail(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER", "CASHIER", "KITCHEN"]);

    const url = new URL(req.url);
    const categoryId = url.searchParams.get("categoryId");

    const items = await p.menuItem.findMany({
      where: {
        restaurantId: ctx.user.restaurantId,
        ...(categoryId ? { categoryId } : {})
      },
      orderBy: { name: "asc" }
    });

    return ok({ items });
  } catch (err) {
    return fail(err);
  }
}
