import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/http/response";
import { kdsBus } from "@/lib/realtime/kdsBus";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(8),
  customerPhone: z.string().min(8),
  customerName: z.string().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        qty: z.number().int().positive(),
        notes: z.string().optional()
      })
    )
    .min(1)
});

export async function POST(req: NextRequest) {
  try {
    const p = prisma as any;
    const body = bodySchema.parse(await req.json());

    const table = await p.restaurantTable.findFirst({
      where: { publicToken: body.token, isEnabled: true },
      select: { restaurantId: true, tableNo: true }
    });
    if (!table) throw new Error("TABLE_TOKEN_INVALID");

    const menuItemIds = Array.from(new Set(body.items.map((i) => i.menuItemId)));

    const menuItems = await p.menuItem.findMany({
      where: {
        restaurantId: table.restaurantId,
        id: { in: menuItemIds },
        isEnabled: true
      },
      select: { id: true, name: true, price: true }
    });

    const byId = new Map<string, any>(menuItems.map((m: any) => [String(m.id), m]));

    const createItems = body.items.map((it) => {
      const mi = byId.get(it.menuItemId);
      if (!mi) throw new Error("MENU_ITEM_INVALID");
      return {
        menuItemId: mi.id,
        nameSnapshot: mi.name,
        priceSnapshot: Number(mi.price),
        qty: it.qty,
        modifiers: [],
        notes: it.notes
      };
    });

    const created = await p.order.create({
      data: {
        restaurantId: table.restaurantId,
        createdByUserId: null,
        type: "DINE_IN",
        tableNo: table.tableNo,
        status: "PLACED",
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        items: { create: createItems }
      },
      include: { items: true }
    });

    kdsBus.publish({
      type: "ORDER_CREATED",
      restaurantId: table.restaurantId,
      orderId: String(created.id)
    });

    return ok({ orderId: created.id });
  } catch (err) {
    return fail(err);
  }
}
