"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast";

type Restaurant = {
  id: string;
  name: string;
  isGstRegistered: boolean;
  gstin: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string | null;
  gstMode: "CGST_SGST" | "IGST";
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  invoicePrefix: string;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await apiFetch<{ restaurant: Restaurant }>("/api/setup/restaurant");
      if (!res.ok) {
        toast.push({ variant: "error", message: res.error?.message || "Failed to load settings" });
        return;
      }
      setRestaurant(res.data.restaurant);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!restaurant) return;

    setSaving(true);
    try {
      const res = await apiFetch("/api/setup/restaurant", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: restaurant.name,
          isGstRegistered: restaurant.isGstRegistered,
          gstin: restaurant.gstin || undefined,
          addressLine1: restaurant.addressLine1,
          addressLine2: restaurant.addressLine2 || undefined,
          city: restaurant.city,
          state: restaurant.state,
          pincode: restaurant.pincode,
          phone: restaurant.phone,
          email: restaurant.email || undefined,
          gstMode: restaurant.gstMode,
          cgstRate: restaurant.cgstRate,
          sgstRate: restaurant.sgstRate,
          igstRate: restaurant.igstRate,
          invoicePrefix: restaurant.invoicePrefix
        })
      });

      if (!res.ok) {
        toast.push({ variant: "error", message: res.error?.message || "Failed to save settings" });
        return;
      }

      toast.push({ variant: "success", message: "Settings saved successfully!" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-red-600">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Restaurant Settings</h1>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Basic Information */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Basic Information</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Restaurant Name *</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={restaurant.name}
                onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone *</label>
              <input
                type="tel"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={restaurant.phone}
                onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={restaurant.email || ""}
                onChange={(e) => setRestaurant({ ...restaurant, email: e.target.value || null })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Invoice Prefix</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={restaurant.invoicePrefix}
                onChange={(e) => setRestaurant({ ...restaurant, invoicePrefix: e.target.value })}
                placeholder="INV"
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Address</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Address Line 1 *</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={restaurant.addressLine1}
                onChange={(e) => setRestaurant({ ...restaurant, addressLine1: e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Address Line 2</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={restaurant.addressLine2 || ""}
                onChange={(e) => setRestaurant({ ...restaurant, addressLine2: e.target.value || null })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">City *</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={restaurant.city}
                onChange={(e) => setRestaurant({ ...restaurant, city: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">State *</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={restaurant.state}
                onChange={(e) => setRestaurant({ ...restaurant, state: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Pincode *</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={restaurant.pincode}
                onChange={(e) => setRestaurant({ ...restaurant, pincode: e.target.value })}
                required
              />
            </div>
          </div>
        </section>

        {/* GST Settings */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">GST Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isGstRegistered"
                className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                checked={restaurant.isGstRegistered}
                onChange={(e) => setRestaurant({ ...restaurant, isGstRegistered: e.target.checked })}
              />
              <label htmlFor="isGstRegistered" className="text-sm font-medium text-slate-700">
                GST Registered
              </label>
            </div>

            {restaurant.isGstRegistered && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">GSTIN</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    value={restaurant.gstin || ""}
                    onChange={(e) => setRestaurant({ ...restaurant, gstin: e.target.value || null })}
                    placeholder="29ABCDE1234F1Z5"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">GST Mode</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    value={restaurant.gstMode}
                    onChange={(e) => setRestaurant({ ...restaurant, gstMode: e.target.value as "CGST_SGST" | "IGST" })}
                  >
                    <option value="CGST_SGST">CGST + SGST (Same State)</option>
                    <option value="IGST">IGST (Interstate)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {restaurant.gstMode === "CGST_SGST" ? (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">CGST Rate (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                          value={restaurant.cgstRate}
                          onChange={(e) => setRestaurant({ ...restaurant, cgstRate: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">SGST Rate (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                          value={restaurant.sgstRate}
                          onChange={(e) => setRestaurant({ ...restaurant, sgstRate: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-700">IGST Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        value={restaurant.igstRate}
                        onChange={(e) => setRestaurant({ ...restaurant, igstRate: Number(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
