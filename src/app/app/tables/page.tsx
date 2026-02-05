"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast";

type Table = {
  id: string;
  tableNo: string;
  capacity: number;
  isEnabled: boolean;
  publicToken: string | null;
};

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNo, setTableNo] = useState("");
  const [capacity, setCapacity] = useState<number>(4);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    const json = await apiFetch<{ tables: Table[] }>("/api/setup/tables");
    if (!json.ok) {
      toast.push({ variant: "error", message: json.error?.message || "Failed to load tables" });
    } else {
      setTables(json.data?.tables ?? []);
    }
    setLoading(false);
  }

  async function createTable() {
    const no = tableNo.trim();
    if (!no) {
      toast.push({ variant: "error", message: "Table number is required" });
      return;
    }
    const json = await apiFetch<{ table: Table }>("/api/setup/tables", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tableNo: no, capacity })
    });
    if (!json.ok) {
      toast.push({ variant: "error", message: json.error?.message || "Failed to create table" });
      return;
    }
    setTableNo("");
    setCapacity(4);
    await refresh();
    toast.push({ variant: "success", message: `Table ${no} created successfully` });
  }

  async function toggleTable(id: string, isEnabled: boolean) {
    const json = await apiFetch(`/api/setup/tables/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isEnabled })
    });
    if (!json.ok) {
      toast.push({ variant: "error", message: json.error?.message || "Failed to update table" });
    } else {
      await refresh();
      toast.push({ variant: "success", message: `Table ${isEnabled ? "enabled" : "disabled"}` });
    }
  }

  async function deleteTable(id: string) {
    if (!confirm("Are you sure you want to delete this table? This cannot be undone.")) return;
    const json = await apiFetch(`/api/setup/tables/${id}`, { method: "DELETE" });
    if (!json.ok) {
      toast.push({ variant: "error", message: json.error?.message || "Failed to delete table" });
    } else {
      await refresh();
      toast.push({ variant: "success", message: "Table deleted" });
    }
  }

  // Tokens are now static and permanent - no regeneration needed
  // This ensures QR codes can be printed once and work forever

  function getOrderUrl(publicToken: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/order/${publicToken}`;
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.push({ variant: "success", message: "Link copied to clipboard" });
    } catch {
      toast.push({ variant: "error", message: "Failed to copy" });
    }
  }

  function generateQRCodeUrl(url: string, size: number = 300) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=svg`;
  }

  function printQR(title: string, url: string, tableNo: string) {
    const qrUrl = generateQRCodeUrl(url, 500);
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      toast.push({ variant: "error", message: "Please allow popups to print QR codes" });
      return;
    }
    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>QR Code - ${title}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background: white;
            }
            .container {
              text-align: center;
              max-width: 600px;
              width: 100%;
            }
            .header {
              margin-bottom: 30px;
            }
            h1 {
              font-size: 36px;
              font-weight: bold;
              margin-bottom: 8px;
              color: #1e293b;
            }
            .subtitle {
              font-size: 18px;
              color: #64748b;
              margin-bottom: 8px;
            }
            .permanent-badge {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 8px;
            }
            .qr-container {
              background: white;
              padding: 30px;
              border: 3px solid #1e293b;
              border-radius: 16px;
              display: inline-block;
              margin: 30px 0;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .qr-container img {
              display: block;
              width: 500px;
              height: 500px;
            }
            .instructions {
              font-size: 16px;
              color: #475569;
              line-height: 1.8;
              margin-top: 30px;
              background: #f8fafc;
              padding: 20px;
              border-radius: 12px;
            }
            .instructions strong {
              color: #1e293b;
              display: block;
              margin-bottom: 12px;
              font-size: 18px;
            }
            .url {
              font-size: 11px;
              color: #64748b;
              word-break: break-all;
              margin-top: 20px;
              padding: 12px;
              background: #f1f5f9;
              border-radius: 6px;
              font-family: monospace;
            }
            .footer-note {
              margin-top: 20px;
              font-size: 12px;
              color: #64748b;
              font-style: italic;
            }
            @media print {
              body { 
                padding: 0;
                min-height: auto;
              }
              .container { 
                max-width: 100%;
                page-break-inside: avoid;
              }
              .qr-container {
                page-break-inside: avoid;
              }
              @page {
                margin: 15mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${title}</h1>
              <div class="subtitle">Scan to order from your table</div>
              <div class="permanent-badge">✓ Permanent QR Code</div>
            </div>
            <div class="qr-container">
              <img src="${qrUrl}" alt="QR Code for ${title}" />
            </div>
            <div class="instructions">
              <strong>How to use:</strong>
              1. Open your phone camera<br />
              2. Point at the QR code<br />
              3. Tap the notification to open menu<br />
              4. Select items and place your order
            </div>
            <div class="url">${url}</div>
            <div class="footer-note">This QR code is permanent and will work forever. Print once and stick to your table.</div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 500);
  }

  function printAllQRs() {
    const tablesWithTokens = tables.filter((t) => t.publicToken && t.isEnabled);
    if (tablesWithTokens.length === 0) {
      toast.push({ variant: "error", message: "No tables with QR codes available" });
      return;
    }
    tablesWithTokens.forEach((table, index) => {
      setTimeout(() => {
        printQR(`Table ${table.tableNo}`, getOrderUrl(table.publicToken!), table.tableNo);
      }, index * 1000);
    });
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-slate-600">Loading tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Table Management</h1>
            <p className="mt-1 text-sm text-slate-600">Manage tables and generate QR codes for customer ordering</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
              onClick={refresh}
            >
              🔄 Refresh
            </button>
            {tables.filter((t) => t.publicToken && t.isEnabled).length > 0 && (
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={printAllQRs}
              >
                🖨️ Print All QR Codes
              </button>
            )}
          </div>
        </div>

        {/* Create New Table */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Add New Table</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Table Number *</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="e.g., T1, Table 5"
                value={tableNo}
                onChange={(e) => setTableNo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createTable()}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Capacity</label>
              <input
                type="number"
                min="1"
                max="20"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value) || 4)}
              />
            </div>
            <div className="flex items-end">
              <button
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={createTable}
              >
                ➕ Add Table
              </button>
            </div>
          </div>
        </section>

        {/* Tables Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              All Tables ({tables.length})
            </h2>
            <div className="text-sm text-slate-600">
              {tables.filter((t) => t.isEnabled).length} enabled •{" "}
              {tables.filter((t) => t.publicToken).length} with QR codes
            </div>
          </div>

          {tables.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-slate-600">No tables yet. Create your first table above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tables.map((table) => {
                const orderUrl = table.publicToken ? getOrderUrl(table.publicToken) : null;
                const qrUrl = orderUrl ? generateQRCodeUrl(orderUrl, 200) : null;

                return (
                  <div
                    key={table.id}
                    className={`group rounded-lg border-2 bg-white p-5 shadow-sm transition-all ${
                      table.isEnabled ? "border-slate-200 hover:border-slate-300" : "border-red-200 bg-red-50"
                    }`}
                  >
                    {/* Table Header */}
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">Table {table.tableNo}</h3>
                          {!table.isEnabled && (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              Disabled
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">Capacity: {table.capacity} guests</p>
                      </div>
                    </div>

                    {/* QR Code Display */}
                    {table.publicToken && table.isEnabled ? (
                      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-700">QR Code (Static)</span>
                          <span className="text-[10px] text-green-600 font-medium" title="This QR code is permanent and will never change">
                            ✓ Permanent
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                          <div className="rounded-lg bg-white p-3">
                            <img src={qrUrl!} alt={`QR Code for Table ${table.tableNo}`} className="h-32 w-32" />
                          </div>
                          <div className="w-full space-y-2">
                            <button
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50"
                              onClick={() => copyText(orderUrl!)}
                            >
                              📋 Copy Link
                            </button>
                            <button
                              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                              onClick={() => printQR(`Table ${table.tableNo}`, orderUrl!, table.tableNo)}
                            >
                              🖨️ Print QR Code
                            </button>
                          </div>
                          <div className="w-full rounded bg-white p-2">
                            <p className="break-all text-[10px] text-slate-500">{orderUrl}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                        <p className="text-sm text-slate-600">
                          {!table.isEnabled ? "Enable table to generate QR code" : "No QR code generated"}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          table.isEnabled
                            ? "border border-slate-300 bg-white hover:bg-slate-50"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                        onClick={() => toggleTable(table.id, !table.isEnabled)}
                      >
                        {table.isEnabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                        onClick={() => deleteTable(table.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

