"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client/api";

type SummaryResponse = {
  range: { from: string | Date; to: string | Date };
  count: number;
  sums: {
    subtotal: number;
    discountAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    total: number;
  };
};

type PaymentsResponse = {
  range: { from: string | Date; to: string | Date };
  modes: { mode: string; count: number; amount: number }[];
};

type GstResponse = {
  range: { from: string | Date; to: string | Date };
  count: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
};

type DailyResponse = {
  range: { from: string | Date; to: string | Date };
  days: {
    date: string;
    count: number;
    subtotal: number;
    discountAmount: number;
    tax: number;
    total: number;
  }[];
};

type ItemWiseResponse = {
  range: { from: string | Date; to: string | Date };
  items: {
    name: string;
    qty: number;
    amount: number;
  }[];
};

export default function ReportsPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 16));

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [payments, setPayments] = useState<PaymentsResponse | null>(null);
  const [gst, setGst] = useState<GstResponse | null>(null);
  const [daily, setDaily] = useState<DailyResponse | null>(null);
  const [itemwise, setItemwise] = useState<ItemWiseResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    const f = new Date(from).toISOString();
    const t = new Date(to).toISOString();
    return `from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`;
  }, [from, to]);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  async function load() {
    setMessage(null);
    setLoading(true);
    try {
      const [s, p, g, d, iw] = await Promise.all([
        apiFetch<SummaryResponse>(`/api/reports/summary?${query}`),
        apiFetch<PaymentsResponse>(`/api/reports/payments?${query}`),
        apiFetch<GstResponse>(`/api/reports/gst?${query}`),
        apiFetch<DailyResponse>(`/api/reports/daily?${query}`),
        apiFetch<ItemWiseResponse>(`/api/reports/items?${query}`)
      ]);

      if (!s.ok) throw new Error(s.error?.code ?? "SUMMARY_FAILED");
      if (!p.ok) throw new Error(p.error?.code ?? "PAYMENTS_FAILED");
      if (!g.ok) throw new Error(g.error?.code ?? "GST_FAILED");
      if (!d.ok) throw new Error(d.error?.code ?? "DAILY_FAILED");
      if (!iw.ok) throw new Error(iw.error?.code ?? "ITEMS_FAILED");

      setSummary(s.data);
      setPayments(p.data);
      setGst(g.data);
      setDaily(d.data);
      setItemwise(iw.data);
    } catch (e: any) {
      setMessage(e?.message ?? "LOAD_FAILED");
    } finally {
      setLoading(false);
    }
  }

  // Auto-load on mount
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Reports</h1>
            <p className="text-sm text-slate-600">View sales, payments, and GST for any custom date range.</p>
          </div>
        </div>

        <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-slate-700">From</label>
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">To</label>
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                onClick={load}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load Reports"}
              </button>
            </div>
            <div className="flex items-end">
              {message ? <p className="text-sm text-red-700">{message}</p> : null}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Bills</p>
              <p className="mt-2 text-2xl font-semibold">{summary ? summary.count : "-"}</p>
            </div>

            <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Net Sales</p>
              <p className="mt-2 text-xl font-semibold">
                {summary ? formatCurrency(summary.sums.total) : "-"}
              </p>
            </div>

            <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Discounts</p>
              <p className="mt-2 text-xl font-semibold text-amber-700">
                {summary ? formatCurrency(summary.sums.discountAmount) : "-"}
              </p>
            </div>

            <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Tax (GST)</p>
              <p className="mt-2 text-xl font-semibold text-emerald-700">
                {summary
                  ? formatCurrency(
                      summary.sums.cgstAmount + summary.sums.sgstAmount + summary.sums.igstAmount
                    )
                  : "-"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Payment Breakdown</h2>
                <p className="text-xs text-slate-500">
                  {payments ? `${payments.modes.reduce((s, m) => s + m.count, 0)} payments` : ""}
                </p>
              </div>

              {!payments ? (
                <p className="mt-4 text-sm text-slate-500">Load a range to see payment details.</p>
              ) : payments.modes.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No payments in this range.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <th className="px-2 py-1">Mode</th>
                        <th className="px-2 py-1 text-right">Count</th>
                        <th className="px-2 py-1 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.modes.map((m) => (
                        <tr key={m.mode} className="border-b border-slate-100 last:border-0">
                          <td className="px-2 py-1">{m.mode}</td>
                          <td className="px-2 py-1 text-right">{m.count}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(m.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">GST Summary</h2>
                <p className="text-xs text-slate-500">
                  {gst ? `${gst.count} invoices` : ""}
                </p>
              </div>

              {!gst ? (
                <p className="mt-4 text-sm text-slate-500">Load a range to see GST details.</p>
              ) : (
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Taxable value</span>
                    <span className="font-medium">{formatCurrency(gst.taxable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">CGST</span>
                    <span>{formatCurrency(gst.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">SGST</span>
                    <span>{formatCurrency(gst.sgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">IGST</span>
                    <span>{formatCurrency(gst.igst)}</span>
                  </div>
                  <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500">
                    Use this section for filing GST returns (GSTR-1 / GSTR-3B).
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Daily sales + item-wise */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Daily sales summary */}
            <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Daily Sales (Bill-wise)</h2>
                  <p className="text-xs text-slate-500">Ideal for Z-report and day closing.</p>
                </div>
                <button
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={!daily}
                  onClick={async () => {
                    try {
                      const url = `/api/reports/daily?${query}&format=csv`;
                      const res = await fetch(url, {
                        headers: { authorization: `Bearer ${localStorage.getItem("accessToken")}` }
                      });
                      if (!res.ok) {
                        setMessage("DAILY_EXPORT_FAILED");
                        return;
                      }
                      const blob = await res.blob();
                      const dlUrl = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = dlUrl;
                      a.download = "daily-sales.csv";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(dlUrl);
                    } catch (err) {
                      setMessage("DAILY_EXPORT_FAILED");
                    }
                  }}
                >
                  Export CSV
                </button>
              </div>

              {!daily ? (
                <p className="mt-4 text-sm text-slate-500">Load a range to see daily sales.</p>
              ) : daily.days.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No invoices in this range.</p>
              ) : (
                <div className="mt-2 max-h-72 overflow-y-auto text-sm">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <th className="px-2 py-1">Date</th>
                        <th className="px-2 py-1 text-right">Bills</th>
                        <th className="px-2 py-1 text-right">Net Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.days.map((d) => (
                        <tr key={d.date} className="border-b border-slate-100 last:border-0">
                          <td className="px-2 py-1">{d.date}</td>
                          <td className="px-2 py-1 text-right">{d.count}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Item-wise sales */}
            <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Item-wise Sales</h2>
                  <p className="text-xs text-slate-500">Top-selling items for the selected range.</p>
                </div>
                <button
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={!itemwise}
                  onClick={async () => {
                    try {
                      const url = `/api/reports/items?${query}&format=csv`;
                      const res = await fetch(url, {
                        headers: { authorization: `Bearer ${localStorage.getItem("accessToken")}` }
                      });
                      if (!res.ok) {
                        setMessage("ITEMS_EXPORT_FAILED");
                        return;
                      }
                      const blob = await res.blob();
                      const dlUrl = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = dlUrl;
                      a.download = "item-sales.csv";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(dlUrl);
                    } catch (err) {
                      setMessage("ITEMS_EXPORT_FAILED");
                    }
                  }}
                >
                  Export CSV
                </button>
              </div>

              {!itemwise ? (
                <p className="mt-4 text-sm text-slate-500">Load a range to see item-wise sales.</p>
              ) : itemwise.items.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No items sold in this range.</p>
              ) : (
                <div className="mt-2 max-h-72 overflow-y-auto text-sm">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <th className="px-2 py-1">Item</th>
                        <th className="px-2 py-1 text-right">Qty</th>
                        <th className="px-2 py-1 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemwise.items.map((it) => (
                        <tr key={it.name} className="border-b border-slate-100 last:border-0">
                          <td className="px-2 py-1">{it.name}</td>
                          <td className="px-2 py-1 text-right">{it.qty}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(it.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
