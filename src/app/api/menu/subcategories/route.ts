import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  categoryId: z.string().min(1),
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

    // Verify category belongs to restaurant
    const category = await p.category.findFirst({
      where: { id: body.categoryId, restaurantId: ctx.user.restaurantId }
    });
    if (!category) {
      return fail(new Error("Category not found"));
    }

    const created = await p.subcategory.create({
      data: {
        restaurantId: ctx.user.restaurantId,
        categoryId: body.categoryId,
        name: body.name,
        sortOrder: body.sortOrder ?? 0,
        isEnabled: body.isEnabled ?? true
      }
    });

    return ok({ subcategory: created });
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

    const subcategories = await p.subcategory.findMany({
      where: {
        restaurantId: ctx.user.restaurantId,
        ...(categoryId ? { categoryId } : {})
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });

    return ok({ subcategories });
  } catch (err) {
    return fail(err);
  }
}
