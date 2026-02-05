import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/http/response";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const bodySchema = z.object({
  channel: z.enum(["SMS", "EMAIL", "WHATSAPP"]).default("SMS"),
  toPhone: z.string().min(8).optional(),
  toEmail: z.string().email().optional(),
  message: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const p = prisma as any;
    const ctx = requireAuth(req);
    requireRole(ctx, ["OWNER", "MANAGER", "CASHIER"]);

    const body = bodySchema.parse(await req.json());

    const invoice = await p.invoice.findFirst({
      where: { id: params.id, restaurantId: ctx.user.restaurantId },
      select: { id: true, invoiceNo: true, customerPhone: true }
    });

    if (!invoice) throw new Error("INVOICE_NOT_FOUND");

    const toPhone = body.toPhone ?? invoice.customerPhone ?? null;

    if (body.channel === "SMS" && !toPhone) throw new Error("PHONE_REQUIRED");
    if (body.channel === "EMAIL" && !body.toEmail) throw new Error("EMAIL_REQUIRED");

    const invoiceUrl = `${env.APP_BASE_URL}/app/print/invoice/${invoice.id}`;
    const defaultMessage = `Invoice ${invoice.invoiceNo}: ${invoiceUrl}`;
    const message = body.message ?? defaultMessage;

    const created = await p.invoiceDelivery.create({
      data: {
        restaurantId: ctx.user.restaurantId,
        invoiceId: invoice.id,
        channel: body.channel,
        status: "PENDING",
        toPhone,
        toEmail: body.toEmail,
        message,
        provider: "OUTBOX"
      }
    });

    return ok({ delivery: created });
  } catch (err) {
    return fail(err);
  }
}
