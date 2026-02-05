import fs from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

export async function storeInvoicePdf(input: {
  restaurantId: string;
  invoiceNo: string;
  pdf: Buffer;
}) {
  if (env.INVOICE_STORAGE_DRIVER === "local") {
    const dir = path.resolve(env.LOCAL_INVOICE_DIR, input.restaurantId);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${safe(input.invoiceNo)}.pdf`;
    const full = path.join(dir, filename);
    await fs.writeFile(full, input.pdf);

    // In production you typically serve from CDN/S3. Local is for dev.
    return { url: `local://${input.restaurantId}/${filename}` };
  }

  // S3 driver intentionally left as a small abstraction seam.
  // Implement with AWS SDK v3 and return https URL.
  throw new Error("S3_NOT_CONFIGURED");
}

function safe(s: string) {
  return s.replace(/[^a-zA-Z0-9-_]/g, "_");
}
