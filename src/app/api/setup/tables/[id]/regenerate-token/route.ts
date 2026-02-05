import { NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

// Generate a deterministic, static token based on restaurant ID and table number
function generateStaticToken(restaurantId: string, tableNo: string): string {
  const input = `${restaurantId}:${tableNo}`;
  const hash = createHash("sha256").update(input).digest("hex");
  return hash.substring(0, 32);
}

// This endpoint now ensures the token is set to the static value
// Tokens are permanent and never change, so this just ensures consistency
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER"]);

    const table = await p.restaurantTable.findFirst({
      where: { id: params.id, restaurantId: ctx.user.restaurantId }
    });

    if (!table) {
      return fail({ code: "TABLE_NOT_FOUND", message: "Table not found" });
    }

    // Set token to the static value (will be the same if already correct)
    const staticToken = generateStaticToken(ctx.user.restaurantId, table.tableNo);

    const updated = await p.restaurantTable.update({
      where: { id: params.id },
      data: {
        publicToken: staticToken
      }
    });

    return ok({ table: updated });
  } catch (err) {
    return fail(err);
  }
}
