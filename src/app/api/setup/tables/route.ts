import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

// Generate a deterministic, static token based on restaurant ID and table number
// This ensures the same table always gets the same token, perfect for printing once
function generateStaticToken(restaurantId: string, tableNo: string): string {
  const input = `${restaurantId}:${tableNo}`;
  const hash = createHash("sha256").update(input).digest("hex");
  // Use first 32 characters for a clean, consistent token
  return hash.substring(0, 32);
}

const createSchema = z.object({
  tableNo: z.string().min(1),
  capacity: z.number().int().positive().optional(),
  isEnabled: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER"]);

    const body = createSchema.parse(await req.json());

    // Generate static token that will never change
    const staticToken = generateStaticToken(ctx.user.restaurantId, body.tableNo);

    const created = await p.restaurantTable.create({
      data: {
        restaurantId: ctx.user.restaurantId,
        tableNo: body.tableNo,
        publicToken: staticToken,
        capacity: body.capacity ?? 4,
        isEnabled: body.isEnabled ?? true
      }
    });

    return ok({ table: created });
  } catch (err) {
    return fail(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER", "CASHIER", "KITCHEN"]);

    const tables = await p.restaurantTable.findMany({
      where: { restaurantId: ctx.user.restaurantId },
      orderBy: { tableNo: "asc" }
    });

    // Ensure all tables have static tokens (migrate old tables if needed)
    const tablesWithTokens = await Promise.all(
      tables.map(async (table: any) => {
        if (!table.publicToken) {
          const staticToken = generateStaticToken(ctx.user.restaurantId, table.tableNo);
          await p.restaurantTable.update({
            where: { id: table.id },
            data: { publicToken: staticToken }
          });
          return { ...table, publicToken: staticToken };
        }
        // Verify token matches static generation (migrate if it doesn't)
        const expectedToken = generateStaticToken(ctx.user.restaurantId, table.tableNo);
        if (table.publicToken !== expectedToken) {
          await p.restaurantTable.update({
            where: { id: table.id },
            data: { publicToken: expectedToken }
          });
          return { ...table, publicToken: expectedToken };
        }
        return table;
      })
    );

    return ok({ tables: tablesWithTokens });
  } catch (err) {
    return fail(err);
  }
}
