import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/http/response";

// Cache menu data for 30 seconds to improve performance
export const revalidate = 30;

const querySchema = z.object({
  token: z.string().min(8)
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { token } = querySchema.parse({ token: url.searchParams.get("token") });

    // First, get table to get restaurantId
    const table = await prisma.restaurantTable.findFirst({
      where: { publicToken: token, isEnabled: true },
      select: { restaurantId: true, tableNo: true }
    });
    if (!table) throw new Error("TABLE_TOKEN_INVALID");

    // Fetch all data in parallel for better performance
    const [restaurant, categories, subcategories, items] = await Promise.all([
      prisma.restaurant.findUnique({
        where: { id: table.restaurantId },
        select: { id: true, name: true }
      }),
      prisma.category.findMany({
        where: { restaurantId: table.restaurantId, isEnabled: true },
        select: { id: true, name: true, sortOrder: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      }),
      prisma.subcategory.findMany({
        where: { restaurantId: table.restaurantId, isEnabled: true },
        select: { id: true, categoryId: true, name: true, sortOrder: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      }),
      prisma.menuItem.findMany({
        where: { restaurantId: table.restaurantId, isEnabled: true },
        select: {
          id: true,
          categoryId: true,
          subcategoryId: true,
          name: true,
          description: true,
          price: true,
          isVeg: true,
          isEnabled: true
        },
        orderBy: { name: "asc" }
      })
    ]);

    // Create lookup maps for faster sorting
    const categorySortMap = new Map(categories.map(c => [c.id, c.sortOrder]));
    const subcategorySortMap = new Map(subcategories.map(s => [s.id, s.sortOrder]));

    // Sort items by category and subcategory
    items.sort((a, b) => {
      const catOrderA = categorySortMap.get(a.categoryId) ?? 999;
      const catOrderB = categorySortMap.get(b.categoryId) ?? 999;
      if (catOrderA !== catOrderB) return catOrderA - catOrderB;

      const subcatOrderA = a.subcategoryId ? (subcategorySortMap.get(a.subcategoryId) ?? 999) : 999;
      const subcatOrderB = b.subcategoryId ? (subcategorySortMap.get(b.subcategoryId) ?? 999) : 999;
      if (subcatOrderA !== subcatOrderB) return subcatOrderA - subcatOrderB;

      return a.name.localeCompare(b.name);
    });

    const response = ok({
      restaurant,
      table: { tableNo: table.tableNo },
      categories,
      subcategories,
      items
    });

    // Add cache headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    return response;
  } catch (err) {
    return fail(err);
  }
}
