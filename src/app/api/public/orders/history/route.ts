import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/http/response";

const querySchema = z.object({
  token: z.string().min(8),
  phone: z.string().min(8)
});

export async function GET(req: NextRequest) {
  try {
    const p = prisma as any;
    const url = new URL(req.url);
    const { token, phone } = querySchema.parse({
      token: url.searchParams.get("token"),
      phone: url.searchParams.get("phone")
    });

    // Verify table token and get restaurant ID
    const table = await p.restaurantTable.findFirst({
      where: { publicToken: token, isEnabled: true },
      select: { restaurantId: true, tableNo: true }
    });
    if (!table) throw new Error("TABLE_TOKEN_INVALID");

    // Fetch previous orders for this phone number at this restaurant
    const orders = await p.order.findMany({
      where: {
        restaurantId: table.restaurantId,
        customerPhone: phone.trim(),
        status: { not: "CANCELLED" }
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 10 // Limit to last 10 orders
    });

    // Format orders for response
    const formattedOrders = orders.map((order: any) => ({
      id: order.id,
      orderId: order.id,
      status: order.status,
      tableNo: order.tableNo,
      customerName: order.customerName,
      createdAt: order.createdAt,
      items: order.items.map((item: any) => ({
        name: item.nameSnapshot,
        price: Number(item.priceSnapshot),
        qty: item.qty,
        notes: item.notes
      })),
      total: order.items.reduce((sum: number, item: any) => 
        sum + (Number(item.priceSnapshot) * item.qty), 0
      )
    }));

    return ok({ orders: formattedOrders });
  } catch (err) {
    return fail(err);
  }
}
