import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { ok, fail } from "@/lib/http/response";

const bodySchema = z.object({
  restaurant: z.object({
    name: z.string().min(2),
    isGstRegistered: z.boolean().default(false),
    gstin: z.string().min(5).optional(),
    addressLine1: z.string().min(2),
    addressLine2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().min(4),
    phone: z.string().min(8),
    email: z.string().email().optional(),
    gstMode: z.enum(["CGST_SGST", "IGST"]).default("CGST_SGST"),
    cgstRate: z.number().nonnegative().default(0),
    sgstRate: z.number().nonnegative().default(0),
    igstRate: z.number().nonnegative().default(0)
  }),
  owner: z.object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().min(8).optional(),
    password: z.string().min(8)
  })
}).superRefine((val, ctx) => {
  if (val.restaurant.isGstRegistered && !val.restaurant.gstin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "GSTIN is required when GST is enabled",
      path: ["restaurant", "gstin"]
    });
  }
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());

    const passwordHash = await hashPassword(body.owner.password);

    const gst = body.restaurant.isGstRegistered
      ? {
          gstin: body.restaurant.gstin,
          gstMode: body.restaurant.gstMode,
          cgstRate: body.restaurant.cgstRate,
          sgstRate: body.restaurant.sgstRate,
          igstRate: body.restaurant.igstRate
        }
      : {
          gstin: null,
          gstMode: body.restaurant.gstMode,
          cgstRate: 0,
          sgstRate: 0,
          igstRate: 0
        };

    const created = (await prisma.restaurant.create({
      data: {
        name: body.restaurant.name,
        isGstRegistered: body.restaurant.isGstRegistered,
        gstin: (gst.gstin ?? null) as any,
        addressLine1: body.restaurant.addressLine1,
        addressLine2: body.restaurant.addressLine2,
        city: body.restaurant.city,
        state: body.restaurant.state,
        pincode: body.restaurant.pincode,
        phone: body.restaurant.phone,
        email: body.restaurant.email,
        gstMode: gst.gstMode,
        cgstRate: gst.cgstRate as any,
        sgstRate: gst.sgstRate as any,
        igstRate: gst.igstRate as any,
        users: {
          create: {
            role: "OWNER",
            name: body.owner.name,
            email: body.owner.email,
            phone: body.owner.phone,
            passwordHash
          }
        }
      },
      include: { users: true }
    })) as any;

    return ok({ restaurantId: created.id, ownerUserId: created.users[0]?.id });
  } catch (err) {
    return fail(err);
  }
}
