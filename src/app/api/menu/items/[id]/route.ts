import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  categoryId: z.string().min(1).optional(),
  subcategoryId: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  isVeg: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  modifiers: z.array(z.object({ name: z.string().min(1), priceDelta: z.number() })).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER"]);

    const body = updateSchema.parse(await req.json());

    await p.menuItem.updateMany({
      where: { id: params.id, restaurantId: ctx.user.restaurantId },
      data: body
    });

    const updated = await p.menuItem.findFirst({
      where: { id: params.id, restaurantId: ctx.user.restaurantId }
    });

    return ok({ item: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER"]);

    await p.menuItem.deleteMany({ where: { id: params.id, restaurantId: ctx.user.restaurantId } });

    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}
