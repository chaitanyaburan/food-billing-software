"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isGstRegistered, setIsGstRegistered] = useState(false);
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError("OWNER_IDENTIFIER_REQUIRED");
      return;
    }

    const isEmail = trimmedIdentifier.includes("@");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        restaurant: {
          name,
          isGstRegistered,
          ...(isGstRegistered ? { gstin: gstin.trim() } : {}),
          addressLine1,
          city,
          state,
          pincode,
          phone
        },
        owner: {
          name: ownerName,
          ...(isEmail ? { email: trimmedIdentifier } : { phone: trimmedIdentifier }),
          password
        }
      })
    });

    const json = await res.json();
    if (!json.ok) {
      const details = Array.isArray(json.error?.details)
        ? JSON.stringify(json.error.details)
        : "";
      setError(`${json.error?.code ?? "REGISTER_FAILED"}${details ? `: ${details}` : ""}`);
      return;
    }

    router.push("/auth/login");
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">Register Restaurant</h1>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="rounded border border-slate-300 px-3 py-2" placeholder="Restaurant name" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2">
            <input
              type="checkbox"
              checked={isGstRegistered}
              onChange={(e) => setIsGstRegistered(e.target.checked)}
            />
            <span className="text-sm">GST Registered</span>
          </label>
          {isGstRegistered ? (
            <input className="rounded border border-slate-300 px-3 py-2" placeholder="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value)} />
          ) : (
            <div className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-600">
              GSTIN not required for businesses under threshold.
            </div>
          )}
          <input className="rounded border border-slate-300 px-3 py-2" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="rounded border border-slate-300 px-3 py-2" placeholder="Address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
          <input className="rounded border border-slate-300 px-3 py-2" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <input className="rounded border border-slate-300 px-3 py-2" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
          <input className="rounded border border-slate-300 px-3 py-2" placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />

          <div className="md:col-span-2 mt-4">
            <h2 className="text-lg font-semibold">Owner account</h2>
          </div>

          <input className="rounded border border-slate-300 px-3 py-2" placeholder="Owner name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          <input className="rounded border border-slate-300 px-3 py-2" placeholder="Owner email or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          <input className="rounded border border-slate-300 px-3 py-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}

          <button className="rounded bg-slate-900 px-4 py-2 text-white md:col-span-2">
            Create tenant
          </button>
        </form>
      </div>
    </main>
  );
}
