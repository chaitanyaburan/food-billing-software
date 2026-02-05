"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password })
    });

    const json = await res.json();
    if (!json.ok) {
      setError(json.error?.code ?? "LOGIN_FAILED");
      return;
    }

    localStorage.setItem("accessToken", json.data.accessToken);
    localStorage.setItem("refreshToken", json.data.refreshToken);
    router.push("/app");
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-2xl font-semibold">Login</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="Email or phone"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button className="w-full rounded bg-slate-900 px-4 py-2 text-white">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
