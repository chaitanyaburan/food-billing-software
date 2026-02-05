"use client";

import { useEffect, useMemo, useState } from "react";

type InvoiceItemDto = {
  id: string;
  nameSnapshot: string;
  qty: number;
  unitPrice: string | number;
  lineTotal: string | number;
};

type PaymentDto = {
  id: string;
  mode: string;
  amount: string | number;
  reference?: string | null;
};

type RestaurantDto = {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  gstin?: string | null;
};

type InvoiceDto = {
  id: string;
  invoiceNo: string;
  createdAt: string;
  invoiceType: string;
  tableNo?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  subtotal: string | number;
  discountAmount: string | number;
  cgstAmount: string | number;
  sgstAmount: string | number;
  igstAmount: string | number;
  total: string | number;
  items: InvoiceItemDto[];
  payments: PaymentDto[];
  restaurant: RestaurantDto;
};

type Props = {
  params: { id: string };
};

export default function PrintInvoicePage({ params }: Props) {
  const [data, setData] = useState<InvoiceDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);

  useEffect(() => {
    // Check if auto-print is enabled in localStorage
    const savedAutoPrint = localStorage.getItem("autoPrintInvoices") === "true";
    setAutoPrint(savedAutoPrint);

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setError("NO_TOKEN");
      return;
    }

    fetch(`/api/billing/invoices/${params.id}`, {
      headers: { authorization: `Bearer ${accessToken}` }
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) {
          setError(j.error?.code ?? "LOAD_FAILED");
          return;
        }
        setData(j.data.invoice);
      })
      .catch(() => setError("LOAD_FAILED"));
  }, [params.id]);

  const totals = useMemo(() => {
    if (!data) return null;
    return {
      subtotal: Number(data.subtotal ?? 0),
      discount: Number(data.discountAmount ?? 0),
      cgst: Number(data.cgstAmount ?? 0),
      sgst: Number(data.sgstAmount ?? 0),
      igst: Number(data.igstAmount ?? 0),
      total: Number(data.total ?? 0)
    };
  }, [data]);

  const totalPaid = useMemo(() => {
    if (!data?.payments) return 0;
    return data.payments.reduce((sum: number, p: PaymentDto) => sum + Number(p.amount ?? 0), 0);
  }, [data]);

  const balance = totals ? Math.max(0, totals.total - totalPaid) : 0;

  // Auto-print when data loads (if enabled)
  useEffect(() => {
    if (data && totals && autoPrint) {
      // Small delay to ensure page is fully rendered
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data, totals, autoPrint]);

  function handlePrint() {
    window.print();
  }

  function toggleAutoPrint() {
    const newValue = !autoPrint;
    setAutoPrint(newValue);
    localStorage.setItem("autoPrintInvoices", String(newValue));
    // Simple feedback
    console.log(newValue ? "Auto-print enabled" : "Auto-print disabled");
  }

  if (error) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!data || !totals) {
    return (
      <main className="min-h-screen p-6">
        <p>Loading...</p>
      </main>
    );
  }

  const r = data.restaurant;
  const dateTime = new Date(data.createdAt);
  const dateStr = dateTime.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = dateTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Print Controls (hidden when printing) */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex flex-col gap-2">
        <button
          className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
          onClick={handlePrint}
        >
          🖨️ Print Invoice
        </button>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs hover:bg-slate-50">
          <input
            type="checkbox"
            checked={autoPrint}
            onChange={toggleAutoPrint}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span>Auto-print on open</span>
        </label>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          <strong>Note:</strong> Browser will show print dialog. For direct printing, set your default printer and enable "Print automatically" in browser settings.
        </div>
      </div>

      {/* Invoice Content - Optimized for 80mm Thermal Printer */}
      <main className="mx-auto w-full max-w-[80mm] bg-white p-0 print:p-0" style={{ display: 'block' }}>
        <div className="invoice-container" style={{ display: 'block' }}>
          {/* Restaurant Header */}
          <div className="restaurant-header">
            <div className="restaurant-name">{r?.name.toUpperCase()}</div>
            <div className="restaurant-address">{r?.addressLine1}</div>
            {r?.addressLine2 && <div className="restaurant-address">{r.addressLine2}</div>}
            <div className="restaurant-address">
              {r?.city}, {r?.state} - {r?.pincode}
            </div>
            <div className="restaurant-phone">Ph: {r?.phone}</div>
            {r?.gstin && <div className="restaurant-gstin">GSTIN: {r.gstin}</div>}
          </div>

          {/* Separator */}
          <div className="separator">━━━━━━━━━━━━━━━━━━━━━━━━</div>

          {/* Invoice Details */}
          <div className="invoice-details">
            <div className="detail-row">
              <span className="detail-label">Invoice No:</span>
              <span className="detail-value">{data.invoiceNo}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{dateStr}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Time:</span>
              <span className="detail-value">{timeStr}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{data.invoiceType.replace("_", " ")}</span>
            </div>
            {data.tableNo && (
              <div className="detail-row">
                <span className="detail-label">Table:</span>
                <span className="detail-value">{data.tableNo}</span>
              </div>
            )}
          </div>

          {/* Customer Info */}
          {(data.customerName || data.customerPhone) && (
            <>
              <div className="separator">━━━━━━━━━━━━━━━━━━━━━━━━</div>
              <div className="customer-info">
                {data.customerName && (
                  <div className="customer-row">
                    <span className="customer-label">Customer:</span>
                    <span className="customer-value">{data.customerName}</span>
                  </div>
                )}
                {data.customerPhone && (
                  <div className="customer-row">
                    <span className="customer-label">Phone:</span>
                    <span className="customer-value">{data.customerPhone}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Separator */}
          <div className="separator">━━━━━━━━━━━━━━━━━━━━━━━━</div>

          {/* Items Header */}
          <div className="separator">────────────────────────────</div>
          <div className="items-header">
            <div className="item-name-header">Item</div>
            <div className="item-qty-header">Qty</div>
            <div className="item-price-header">Price</div>
            <div className="item-total-header">Total</div>
          </div>
          <div className="separator">────────────────────────────</div>

          {/* Items List */}
          <div className="items-list">
            {(data.items ?? []).map((it) => (
              <div key={it.id} className="item-row">
                <div className="item-name">{it.nameSnapshot}</div>
                <div className="item-row-details">
                  <div className="item-qty">{it.qty}</div>
                  <div className="item-unit-price">@ ₹{Number(it.unitPrice).toFixed(2)}</div>
                  <div className="item-line-total">₹{Number(it.lineTotal).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Separator */}
          <div className="separator">━━━━━━━━━━━━━━━━━━━━━━━━</div>

          {/* Totals */}
          <div className="totals-section">
            <div className="total-row">
              <span>Subtotal:</span>
              <span className="total-amount">₹ {totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="total-row discount-row">
                <span>Discount:</span>
                <span className="total-amount">- ₹ {totals.discount.toFixed(2)}</span>
              </div>
            )}
            {(totals.cgst > 0 || totals.sgst > 0 || totals.igst > 0) && (
              <div className="gst-section">
                {totals.cgst > 0 && (
                  <div className="gst-row">
                    <span>CGST:</span>
                    <span>₹ {totals.cgst.toFixed(2)}</span>
                  </div>
                )}
                {totals.sgst > 0 && (
                  <div className="gst-row">
                    <span>SGST:</span>
                    <span>₹ {totals.sgst.toFixed(2)}</span>
                  </div>
                )}
                {totals.igst > 0 && (
                  <div className="gst-row">
                    <span>IGST:</span>
                    <span>₹ {totals.igst.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
            <div className="separator">────────────────────────────</div>
            <div className="grand-total-row">
              <span>GRAND TOTAL:</span>
              <span className="grand-total-amount">₹ {totals.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payments */}
          {data.payments && data.payments.length > 0 && (
            <>
              <div className="separator">━━━━━━━━━━━━━━━━━━━━━━━━</div>
              <div className="payments-section">
                <div className="payments-header">PAYMENT DETAILS</div>
                {data.payments.map((p) => (
                  <div key={p.id} className="payment-row">
                    <span>
                      {p.mode}
                      {p.reference ? ` (${p.reference})` : ""}:
                    </span>
                    <span>₹ {Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
                <div className="separator">────────────────────────────</div>
                <div className="payment-total-row">
                  <span>Total Paid:</span>
                  <span>₹ {totalPaid.toFixed(2)}</span>
                </div>
                {balance > 0 && (
                  <div className="payment-balance-row">
                    <span>Balance:</span>
                    <span>₹ {balance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="separator">━━━━━━━━━━━━━━━━━━━━━━━━</div>
          <div className="footer">
            <div className="footer-text">Thank you for your visit!</div>
            <div className="footer-text">Visit us again soon</div>
          </div>
        </div>
      </main>

      {/* Print Styles - Optimized for 80mm Thermal Printers */}
      <style jsx global>{`
        /* Reset for print */
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          html, body {
            width: 80mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            font-family: "Courier New", monospace !important;
            overflow: visible !important;
          }

          /* Hide print controls and other elements */
          .print\\:hidden {
            display: none !important;
          }

          /* Ensure main and all its content is visible */
          main {
            display: block !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: white !important;
            position: relative !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #000 !important;
          }

          main * {
            visibility: visible !important;
            opacity: 1 !important;
            color: inherit !important;
          }

          /* Invoice Container */
          .invoice-container {
            display: block !important;
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 8mm 5mm !important;
            font-family: "Courier New", monospace !important;
            font-size: 11pt !important;
            line-height: 1.3 !important;
            color: #000 !important;
            background: white !important;
            visibility: visible !important;
            opacity: 1 !important;
          }

          .invoice-container > * {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #000 !important;
          }

          /* Restaurant Header */
          .restaurant-header {
            text-align: center;
            margin-bottom: 8px;
          }

          .restaurant-name {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
          }

          .restaurant-address {
            font-size: 10pt;
            margin-bottom: 2px;
          }

          .restaurant-phone {
            font-size: 10pt;
            margin-bottom: 2px;
          }

          .restaurant-gstin {
            font-size: 9pt;
            margin-top: 2px;
          }

          /* Separator */
          .separator {
            text-align: center;
            margin: 6px 0;
            font-size: 9pt;
            color: #000;
            line-height: 1;
          }

          /* Invoice Details */
          .invoice-details {
            margin-bottom: 6px;
          }

          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10pt;
          }

          .detail-label {
            font-weight: normal;
          }

          .detail-value {
            font-weight: bold;
          }

          /* Customer Info */
          .customer-info {
            margin-bottom: 6px;
          }

          .customer-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10pt;
          }

          .customer-label {
            font-weight: normal;
          }

          .customer-value {
            font-weight: bold;
          }

          /* Items */
          .items-header {
            display: table;
            width: 100%;
            table-layout: fixed;
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 4px;
            padding-bottom: 2px;
          }

          .item-name-header,
          .item-qty-header,
          .item-price-header,
          .item-total-header {
            display: table-cell;
            padding: 2px 0;
          }

          .item-name-header {
            width: 45%;
            text-align: left;
          }

          .item-qty-header {
            width: 15%;
            text-align: center;
          }

          .item-price-header {
            width: 20%;
            text-align: right;
          }

          .item-total-header {
            width: 20%;
            text-align: right;
          }

          .items-list {
            margin-bottom: 6px;
          }

          .item-row {
            margin-bottom: 8px;
            font-size: 10pt;
            page-break-inside: avoid;
          }

          .item-name {
            font-weight: bold;
            margin-bottom: 3px;
            word-wrap: break-word;
            line-height: 1.2;
          }

          .item-row-details {
            display: table;
            width: 100%;
            table-layout: fixed;
            font-size: 9pt;
            padding-left: 2mm;
          }

          .item-qty,
          .item-unit-price,
          .item-line-total {
            display: table-cell;
            padding: 1px 0;
          }

          .item-qty {
            width: 15%;
            text-align: center;
          }

          .item-unit-price {
            width: 20%;
            text-align: right;
          }

          .item-line-total {
            width: 20%;
            text-align: right;
            font-weight: bold;
          }

          /* Totals */
          .totals-section {
            margin-bottom: 6px;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10pt;
          }

          .discount-row {
            color: #666;
          }

          .gst-section {
            margin-top: 4px;
            margin-bottom: 4px;
          }

          .gst-row {
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            margin-bottom: 2px;
            padding-left: 4mm;
          }

          .grand-total-row {
            display: flex;
            justify-content: space-between;
            font-size: 12pt;
            font-weight: bold;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px dashed #000;
          }

          .total-amount {
            font-weight: bold;
          }

          .grand-total-amount {
            font-size: 14pt;
            font-weight: bold;
          }

          /* Payments */
          .payments-section {
            margin-bottom: 6px;
          }

          .payments-header {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 4px;
            text-align: center;
          }

          .payment-row {
            display: flex;
            justify-content: space-between;
            font-size: 10pt;
            margin-bottom: 3px;
          }

          .payment-total-row {
            display: flex;
            justify-content: space-between;
            font-size: 11pt;
            font-weight: bold;
            margin-top: 4px;
          }

          .payment-balance-row {
            display: flex;
            justify-content: space-between;
            font-size: 11pt;
            font-weight: bold;
            color: #d00;
            margin-top: 2px;
          }

          /* Footer */
          .footer {
            text-align: center;
            margin-top: 8px;
          }

          .footer-text {
            font-size: 10pt;
            margin-bottom: 3px;
          }

          /* Page break control */
          .invoice-container {
            page-break-inside: avoid;
          }

          .item-row {
            page-break-inside: avoid;
          }

          /* Ensure all sections are visible */
          .restaurant-header,
          .invoice-details,
          .customer-info,
          .items-header,
          .items-list,
          .totals-section,
          .payments-section,
          .footer {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #000 !important;
          }

          .restaurant-header > *,
          .invoice-details > *,
          .customer-info > *,
          .items-list > *,
          .totals-section > *,
          .payments-section > *,
          .footer > * {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #000 !important;
          }

          /* Ensure separators are visible */
          .separator {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #000 !important;
          }

          /* Ensure all text elements are visible */
          .detail-row,
          .customer-row,
          .item-row,
          .total-row,
          .gst-row,
          .payment-row {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #000 !important;
          }

          /* Ensure spans and divs are visible */
          .detail-label,
          .detail-value,
          .customer-label,
          .customer-value,
          .item-name,
          .item-qty,
          .item-unit-price,
          .item-line-total {
            display: inline-block !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #000 !important;
          }
        }

        /* Screen styles */
        @media screen {
          .invoice-container {
            width: 80mm;
            max-width: 80mm;
            margin: 20px auto;
            padding: 8mm 5mm;
            font-family: "Courier New", monospace;
            font-size: 11pt;
            line-height: 1.3;
            color: #000;
            background: white;
            border: 1px solid #ddd;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .restaurant-header {
            text-align: center;
            margin-bottom: 8px;
          }

          .restaurant-name {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
          }

          .restaurant-address {
            font-size: 10pt;
            margin-bottom: 2px;
          }

          .restaurant-phone {
            font-size: 10pt;
            margin-bottom: 2px;
          }

          .restaurant-gstin {
            font-size: 9pt;
            margin-top: 2px;
          }

          .separator {
            text-align: center;
            margin: 6px 0;
            font-size: 9pt;
            color: #000;
            line-height: 1;
          }

          .invoice-details {
            margin-bottom: 6px;
          }

          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10pt;
          }

          .detail-label {
            font-weight: normal;
          }

          .detail-value {
            font-weight: bold;
          }

          .customer-info {
            margin-bottom: 6px;
          }

          .customer-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10pt;
          }

          .customer-label {
            font-weight: normal;
          }

          .customer-value {
            font-weight: bold;
          }

          .items-header {
            display: table;
            width: 100%;
            table-layout: fixed;
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 4px;
            padding-bottom: 2px;
          }

          .item-name-header,
          .item-qty-header,
          .item-price-header,
          .item-total-header {
            display: table-cell;
            padding: 2px 0;
          }

          .item-name-header {
            width: 45%;
            text-align: left;
          }

          .item-qty-header {
            width: 15%;
            text-align: center;
          }

          .item-price-header {
            width: 20%;
            text-align: right;
          }

          .item-total-header {
            width: 20%;
            text-align: right;
          }

          .items-list {
            margin-bottom: 6px;
          }

          .item-row {
            margin-bottom: 8px;
            font-size: 10pt;
          }

          .item-name {
            font-weight: bold;
            margin-bottom: 3px;
            word-wrap: break-word;
            line-height: 1.2;
          }

          .item-row-details {
            display: table;
            width: 100%;
            table-layout: fixed;
            font-size: 9pt;
            padding-left: 2mm;
          }

          .item-qty,
          .item-unit-price,
          .item-line-total {
            display: table-cell;
            padding: 1px 0;
          }

          .item-qty {
            width: 15%;
            text-align: center;
          }

          .item-unit-price {
            width: 20%;
            text-align: right;
          }

          .item-line-total {
            width: 20%;
            text-align: right;
            font-weight: bold;
          }

          .totals-section {
            margin-bottom: 6px;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10pt;
          }

          .discount-row {
            color: #666;
          }

          .gst-section {
            margin-top: 4px;
            margin-bottom: 4px;
          }

          .gst-row {
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            margin-bottom: 2px;
            padding-left: 4mm;
          }

          .grand-total-row {
            display: flex;
            justify-content: space-between;
            font-size: 12pt;
            font-weight: bold;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px dashed #000;
          }

          .total-amount {
            font-weight: bold;
          }

          .grand-total-amount {
            font-size: 14pt;
            font-weight: bold;
          }

          .payments-section {
            margin-bottom: 6px;
          }

          .payments-header {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 4px;
            text-align: center;
          }

          .payment-row {
            display: flex;
            justify-content: space-between;
            font-size: 10pt;
            margin-bottom: 3px;
          }

          .payment-total-row {
            display: flex;
            justify-content: space-between;
            font-size: 11pt;
            font-weight: bold;
            margin-top: 4px;
          }

          .payment-balance-row {
            display: flex;
            justify-content: space-between;
            font-size: 11pt;
            font-weight: bold;
            color: #d00;
            margin-top: 2px;
          }

          .footer {
            text-align: center;
            margin-top: 8px;
          }

          .footer-text {
            font-size: 10pt;
            margin-bottom: 3px;
          }
        }
      `}</style>
    </>
  );
}
