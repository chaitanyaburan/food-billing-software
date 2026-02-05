import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-semibold">Restaurant Billing SaaS</h1>
        <p className="text-slate-700">
          Production-ready multi-tenant foundation: Auth + RBAC, GST billing,
          Orders/KDS, Reports.
        </p>
        <div className="flex gap-3">
          <Link
            href="/auth/login"
            className="rounded bg-slate-900 px-4 py-2 text-white"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="rounded border border-slate-300 px-4 py-2"
          >
            Register Restaurant
          </Link>
        </div>
      </div>
    </main>
  );
}
