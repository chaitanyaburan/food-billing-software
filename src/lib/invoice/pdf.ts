import PDFDocument from "pdfkit";

export type InvoicePdfInput = {
  restaurant: {
    name: string;
    gstin?: string | null;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  invoice: {
    invoiceNo: string;
    createdAt: Date;
    invoiceType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
    tableNo?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    items: Array<{ name: string; qty: number; price: number; lineTotal: number }>;
    subtotal: number;
    discountAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    total: number;
  };
};

export async function renderInvoicePdf(input: InvoicePdfInput) {
  const doc = new PDFDocument({ size: "A4", margin: 36 });

  const chunks: Buffer[] = [];
  doc.on("data", (d) => chunks.push(Buffer.from(d)));

  doc.fontSize(16).text(input.restaurant.name, { align: "left" });
  if (input.restaurant.gstin) {
    doc.fontSize(10).text(`GSTIN: ${input.restaurant.gstin}`);
  }
  doc.text(`${input.restaurant.addressLine1}`);
  if (input.restaurant.addressLine2) doc.text(input.restaurant.addressLine2);
  doc.text(`${input.restaurant.city}, ${input.restaurant.state} ${input.restaurant.pincode}`);
  doc.text(`Phone: ${input.restaurant.phone}`);

  doc.moveDown();
  doc.fontSize(12).text(`Invoice: ${input.invoice.invoiceNo}`);
  doc.fontSize(10).text(`Date: ${input.invoice.createdAt.toISOString()}`);
  doc.text(`Type: ${input.invoice.invoiceType}`);
  if (input.invoice.tableNo) doc.text(`Table: ${input.invoice.tableNo}`);
  if (input.invoice.customerName) doc.text(`Customer: ${input.invoice.customerName}`);
  if (input.invoice.customerPhone) doc.text(`Customer Phone: ${input.invoice.customerPhone}`);

  doc.moveDown();
  doc.fontSize(11).text("Items");
  doc.moveDown(0.5);

  input.invoice.items.forEach((it) => {
    doc.fontSize(10).text(`${it.name}  x${it.qty}  @ ${it.price.toFixed(2)}  = ${it.lineTotal.toFixed(2)}`);
  });

  doc.moveDown();
  doc.fontSize(10).text(`Subtotal: ${input.invoice.subtotal.toFixed(2)}`);
  if (input.invoice.discountAmount > 0) {
    doc.text(`Discount: -${input.invoice.discountAmount.toFixed(2)}`);
  }
  if (input.invoice.cgstAmount > 0) doc.text(`CGST: ${input.invoice.cgstAmount.toFixed(2)}`);
  if (input.invoice.sgstAmount > 0) doc.text(`SGST: ${input.invoice.sgstAmount.toFixed(2)}`);
  if (input.invoice.igstAmount > 0) doc.text(`IGST: ${input.invoice.igstAmount.toFixed(2)}`);

  doc.fontSize(12).text(`Total: ${input.invoice.total.toFixed(2)}`, { underline: true });

  doc.end();

  await new Promise<void>((resolve) => doc.on("end", () => resolve()));
  return Buffer.concat(chunks);
}
