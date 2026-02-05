import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/http/response";

export async function GET(req: NextRequest) {
  try {
    const ctx = requireAuth(req);
    const p = prisma as any;

    const restaurant = await p.restaurant.findUnique({
      where: { id: ctx.user.restaurantId },
      select: {
        id: true,
        name: true,
        isGstRegistered: true,
        gstin: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        pincode: true,
        phone: true,
        email: true,
        gstMode: true,
        cgstRate: true,
        sgstRate: true,
        igstRate: true,
        invoicePrefix: true
      }
    });

    if (!restaurant) {
      return fail({ code: "RESTAURANT_NOT_FOUND", message: "Restaurant not found" });
    }

    return ok({
      restaurant: {
        ...restaurant,
        cgstRate: Number(restaurant.cgstRate),
        sgstRate: Number(restaurant.sgstRate),
        igstRate: Number(restaurant.igstRate)
      }
    });
  } catch (err) {
    return fail(err);
  }
}

const updateSchema = z
  .object({
    name: z.string().min(2),
    isGstRegistered: z.boolean(),
    gstin: z.string().optional(),
    addressLine1: z.string().min(2),
    addressLine2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().min(4),
    phone: z.string().min(8),
    email: z.string().email().optional(),
    gstMode: z.enum(["CGST_SGST", "IGST"]),
    cgstRate: z.number().nonnegative(),
    sgstRate: z.number().nonnegative(),
    igstRate: z.number().nonnegative(),
    invoicePrefix: z.string().min(1)
  })
  .refine(
    (data) => {
      if (data.isGstRegistered && !data.gstin) {
        return false;
      }
      return true;
    },
    {
      message: "GSTIN is required when GST registered",
      path: ["gstin"]
    }
  );

export async function PATCH(req: NextRequest) {
  try {
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER"]);
    const p = prisma as any;

    const body = updateSchema.parse(await req.json());

    const updated = await p.restaurant.update({
      where: { id: ctx.user.restaurantId },
      data: {
        name: body.name,
        isGstRegistered: body.isGstRegistered,
        gstin: body.isGstRegistered ? (body.gstin ?? null) : null,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2 ?? null,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        phone: body.phone,
        email: body.email ?? null,
        gstMode: body.gstMode,
        cgstRate: body.cgstRate,
        sgstRate: body.sgstRate,
        igstRate: body.igstRate,
        invoicePrefix: body.invoicePrefix
      },
      select: {
        id: true,
        name: true,
        isGstRegistered: true,
        gstin: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        pincode: true,
        phone: true,
        email: true,
        gstMode: true,
        cgstRate: true,
        sgstRate: true,
        igstRate: true,
        invoicePrefix: true
      }
    });

    return ok({
      restaurant: {
        ...updated,
        cgstRate: Number(updated.cgstRate),
        sgstRate: Number(updated.sgstRate),
        igstRate: Number(updated.igstRate)
      }
    });
  } catch (err) {
    return fail(err);
  }
}
