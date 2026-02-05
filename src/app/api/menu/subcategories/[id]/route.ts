import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  isEnabled: z.boolean().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER"]);

    const body = updateSchema.parse(await req.json());

    await p.subcategory.updateMany({
      where: { id: params.id, restaurantId: ctx.user.restaurantId },
      data: body
    });

    const updated = await p.subcategory.findFirst({
      where: { id: params.id, restaurantId: ctx.user.restaurantId }
    });

    return ok({ subcategory: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER"]);

    await p.subcategory.deleteMany({ where: { id: params.id, restaurantId: ctx.user.restaurantId } });
    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}
