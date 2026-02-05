import { z } from "zod";

export const discountSchema = z
  .object({
    type: z.enum(["FLAT", "PERCENT"]),
    value: z.number().nonnegative()
  })
  .optional();

export type Discount = z.infer<typeof discountSchema>;

export type GstMode = "CGST_SGST" | "IGST";

export function computeTotals(input: {
  subtotal: number;
  discount?: Discount;
  gstMode: GstMode;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
}) {
  const subtotal = round2(input.subtotal);

  const discountAmount = input.discount
    ? input.discount.type === "FLAT"
      ? round2(input.discount.value)
      : round2((subtotal * input.discount.value) / 100)
    : 0;

  const taxable = Math.max(0, round2(subtotal - discountAmount));

  const cgstAmount = input.gstMode === "CGST_SGST" ? round2((taxable * input.cgstRate) / 100) : 0;
  const sgstAmount = input.gstMode === "CGST_SGST" ? round2((taxable * input.sgstRate) / 100) : 0;
  const igstAmount = input.gstMode === "IGST" ? round2((taxable * input.igstRate) / 100) : 0;

  const total = round2(taxable + cgstAmount + sgstAmount + igstAmount);

  return {
    subtotal,
    taxable,
    discountAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    total
  };
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
