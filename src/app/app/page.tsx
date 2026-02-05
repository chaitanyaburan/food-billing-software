"use client";

import Link from "next/link";

export default function AppHome() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-slate-700">
          This is the authenticated area. Your UI should fetch with Authorization:
          Bearer &lt;token&gt;.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link className="rounded border border-slate-300 p-4" href="/app/pos">
            POS Billing
          </Link>
          <Link className="rounded border border-slate-300 p-4" href="/app/kds">
            Kitchen Display (KDS)
          </Link>
          <Link className="rounded border border-slate-300 p-4" href="/app/reports">
            Reports
          </Link>
          <Link className="rounded border border-slate-300 p-4" href="/app/menu">
            Menu
          </Link>
          <Link className="rounded border border-slate-300 p-4" href="/app/tables">
            Tables
          </Link>
        </div>
      </div>
    </div>
  );
}
