"use client";

import { useEffect, useMemo, useState } from "react";

type MenuCategory = { id: string; name: string; sortOrder: number };
type Subcategory = { id: string; categoryId: string; name: string; sortOrder: number };
type MenuItem = {
  id: string;
  categoryId: string;
  subcategoryId?: string | null;
  name: string;
  price: any;
  isEnabled: boolean;
  isVeg?: boolean;
  description?: string | null;
};

type CartLine = {
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  qty: number;
  notes: string;
};

export default function TableOrderPage({ params }: { params: { tableToken: string } }) {
  const token = params.tableToken;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [tableNo, setTableNo] = useState<string>("");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Use AbortController for better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    fetch(`/api/public/menu?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
      cache: 'default' // Allow browser caching
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        clearTimeout(timeoutId);
        if (!j.ok) {
          setError(j.error?.message || "Failed to load menu");
          return;
        }
        setRestaurantName(j.data?.restaurant?.name ?? "");
        setTableNo(j.data?.table?.tableNo ?? "");
        const cats = j.data?.categories ?? [];
        setCategories(cats);
        const subs = j.data?.subcategories ?? [];
        setSubcategories(subs);
        if (cats[0]?.id) setActiveCategoryId(cats[0].id);
        setItems(j.data?.items ?? []);
      })
      .catch((e) => {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
          setError("Request timed out. Please try again.");
        } else {
          setError("Failed to connect. Please check your internet connection.");
        }
        console.error(e);
      })
      .finally(() => setLoading(false));
    
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [token]);

  // Group items by category and subcategory
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<string, Map<string | null, MenuItem[]>>();
    items
      .filter((i) => i.isEnabled !== false)
      .forEach((item) => {
        if (!grouped.has(item.categoryId)) {
          grouped.set(item.categoryId, new Map());
        }
        const categoryMap = grouped.get(item.categoryId)!;
        const subcatKey = item.subcategoryId || null;
        if (!categoryMap.has(subcatKey)) {
          categoryMap.set(subcatKey, []);
        }
        categoryMap.get(subcatKey)!.push(item);
      });
    return grouped;
  }, [items]);

  const visibleItems = useMemo(() => {
    let filtered = items.filter((i) => i.isEnabled !== false);

    if (activeCategoryId) {
      filtered = filtered.filter((i) => i.categoryId === activeCategoryId);
    }

    if (activeSubcategoryId) {
      filtered = filtered.filter((i) => i.subcategoryId === activeSubcategoryId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.description?.toLowerCase().includes(query) ||
          categories.find((c) => c.id === i.categoryId)?.name.toLowerCase().includes(query) ||
          subcategories.find((s) => s.id === i.subcategoryId)?.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, activeCategoryId, activeSubcategoryId, searchQuery, categories, subcategories]);

  // Get subcategories for active category
  const activeSubcategories = useMemo(() => {
    if (!activeCategoryId) return [];
    return subcategories
      .filter((s) => s.categoryId === activeCategoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [subcategories, activeCategoryId]);

  const subtotal = useMemo(
    () => cart.reduce((sum, it) => sum + it.qty * it.priceSnapshot, 0),
    [cart]
  );

  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  function addToCart(mi: MenuItem) {
    setMessage(null);
    const price = Number(mi.price);
    setAddedItemId(mi.id);
    setTimeout(() => setAddedItemId(null), 600);
    
    setCart((prev) => {
      const existing = prev.find((x) => x.menuItemId === mi.id);
      if (existing) {
        return prev.map((x) => (x.menuItemId === mi.id ? { ...x, qty: x.qty + 1 } : x));
      }
      return [
        ...prev,
        {
          menuItemId: mi.id,
          nameSnapshot: mi.name,
          priceSnapshot: price,
          qty: 1,
          notes: ""
        }
      ];
    });
  }

  function updateQty(menuItemId: string, qty: number) {
    setCart((prev) => {
      const nextQty = Math.max(0, qty);
      if (nextQty === 0) return prev.filter((x) => x.menuItemId !== menuItemId);
      return prev.map((x) => (x.menuItemId === menuItemId ? { ...x, qty: nextQty } : x));
    });
  }

  function updateNotes(menuItemId: string, notes: string) {
    setCart((prev) => prev.map((x) => (x.menuItemId === menuItemId ? { ...x, notes } : x)));
  }

  async function fetchOrderHistory(phone: string) {
    if (!phone || phone.trim().length < 8) return;
    
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/public/orders/history?token=${encodeURIComponent(token)}&phone=${encodeURIComponent(phone.trim())}`);
      const json = await res.json();
      if (json.ok) {
        setOrderHistory(json.data?.orders || []);
        setShowOrderHistory(true);
      }
    } catch (e) {
      console.error("Failed to fetch order history", e);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function placeOrder() {
    setMessage(null);
    if (cart.length === 0) {
      setMessage("Please add items to your cart");
      return;
    }

    if (!customerPhone || customerPhone.trim().length < 8) {
      setMessage("Please enter a valid phone number");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          customerPhone: customerPhone.trim(),
          customerName: customerName.trim() || undefined,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            qty: c.qty,
            notes: c.notes.trim() || undefined
          }))
        })
      });

      const json = await res.json();
      if (!json.ok) {
        setMessage(json.error?.message || "Failed to place order. Please try again.");
        return;
      }

      setOrderPlaced(true);
      setOrderId(json.data?.orderId || null);
      setCart([]);
      setCustomerPhone("");
      setCustomerName("");
      setMessage(null);
    } catch (e) {
      setMessage("Network error. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center">
            <div className="mb-6 relative">
              <div className="inline-block h-20 w-20 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl">🍽️</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Loading Menu</h2>
            <p className="text-base text-slate-600">Preparing delicious options for you...</p>
            <div className="mt-6 flex justify-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xl">
            <div className="mb-4 text-6xl">⚠️</div>
            <h1 className="mb-2 text-2xl font-bold text-slate-900">Unable to Load Menu</h1>
            <p className="mb-6 text-slate-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl"
            >
              🔄 Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (orderPlaced) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md rounded-2xl border border-green-200 bg-white p-8 text-center shadow-xl">
            <div className="mb-6 text-7xl animate-bounce">✅</div>
            <h1 className="mb-3 text-3xl font-bold text-slate-900">Order Placed Successfully!</h1>
            <p className="mb-2 text-lg text-slate-700">Your order has been sent to the kitchen</p>
            <p className="mb-6 text-sm text-slate-600">
              Our staff will prepare it shortly. You'll receive updates on <strong className="text-slate-900">{customerPhone}</strong>
            </p>
            {orderId && (
              <div className="mb-6 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-600">Order ID</p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900">{orderId}</p>
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setOrderPlaced(false);
                  setSearchQuery("");
                  setActiveCategoryId(categories[0]?.id || "");
                  setOrderId(null);
                }}
                className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl"
              >
                ➕ Order More Items
              </button>
              <p className="text-xs text-slate-500">You can place another order anytime</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  return (
    <>
      <style>{`
        .category-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
          scroll-behavior: smooth;
          position: relative;
        }
        .category-scroll::-webkit-scrollbar {
          display: none;
        }
        .category-scroll-container {
          position: relative;
        }
        .category-scroll-container::before,
        .category-scroll-container::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 30px;
          pointer-events: none;
          z-index: 10;
        }
        .category-scroll-container::before {
          left: 0;
          background: linear-gradient(to right, rgba(255,255,255,1), transparent);
        }
        .category-scroll-container::after {
          right: 0;
          background: linear-gradient(to left, rgba(255,255,255,1), transparent);
        }
        @keyframes itemAdded {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); background-color: #10b981; }
          100% { transform: scale(1); }
        }
        .item-added {
          animation: itemAdded 0.6s ease-in-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .menu-item-card {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {restaurantName || "3stories"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-slate-600">Table</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                  {tableNo || ""}
                </span>
              </div>
            </div>
            {cartItemCount > 0 && (
              <button
                onClick={() => {
                  setShowCart(true);
                  setShowCheckout(false);
                }}
                className="relative flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-green-700 hover:shadow-xl hover:scale-105 active:scale-95 md:hidden"
              >
                <span className="text-lg">🛒</span>
                <span>{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</span>
                <span className="ml-1 rounded-full bg-white/30 px-2.5 py-1 text-xs font-bold">₹ {subtotal.toFixed(0)}</span>
                {cartItemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md animate-pulse">
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}
            {cartItemCount > 0 && (
              <button
                onClick={() => {
                  setShowCart(true);
                  setShowCheckout(false);
                }}
                className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-green-700 hover:shadow-xl hover:scale-105 active:scale-95 md:flex"
              >
                <span className="text-lg">🛒</span>
                <span>{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</span>
                <span className="ml-2 rounded-full bg-white/30 px-3 py-1 text-xs font-bold">₹ {subtotal.toFixed(0)}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 md:p-6">
        {/* Search Bar - Enhanced */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">🔍</div>
            <input
              type="text"
              className="w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-12 py-4 text-base shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 transition-all"
              placeholder="Search menu items, categories..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setActiveCategoryId("");
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-110 transition-all"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (visibleItems.length / items.length) * 100)}%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                <span className="text-emerald-600">{visibleItems.length}</span> {visibleItems.length === 1 ? "item" : "items"} found
              </p>
            </div>
          )}
        </div>

        {/* Horizontal Sliding Categories - Below Search Bar */}
        <div className="mb-6">
          <div className="sticky top-16 z-20 -mx-4 px-4 bg-gradient-to-b from-white via-white to-transparent backdrop-blur-md pb-4 md:-mx-6 md:px-6">
            <div className="category-scroll-container relative">
              <div className="category-scroll flex gap-3 overflow-x-auto pb-3 px-1">
                <button
                  className={`flex-shrink-0 rounded-full px-6 py-3 text-sm font-bold transition-all duration-300 whitespace-nowrap shadow-sm ${
                    !activeCategoryId && !searchQuery
                      ? "bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 text-white shadow-lg shadow-emerald-200/50 scale-105 ring-2 ring-emerald-300/30"
                      : "bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 hover:border-emerald-300 hover:shadow-md"
                  }`}
                  onClick={() => {
                    setActiveCategoryId("");
                    setActiveSubcategoryId("");
                    setSearchQuery("");
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <span>All Items</span>
                    {!activeCategoryId && !searchQuery && (
                      <span className="ml-1.5 rounded-full bg-white/30 px-2.5 py-1 text-xs font-bold backdrop-blur-sm">
                        {items.filter((i) => i.isEnabled !== false).length}
                      </span>
                    )}
                  </span>
                </button>
                {categories.map((c) => {
                  const itemCount = items.filter((i) => i.categoryId === c.id && i.isEnabled !== false).length;
                  return (
                    <button
                      key={c.id}
                      className={`flex-shrink-0 rounded-full px-6 py-3 text-sm font-bold transition-all duration-300 whitespace-nowrap shadow-sm ${
                        c.id === activeCategoryId
                          ? "bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 text-white shadow-lg shadow-emerald-200/50 scale-105 ring-2 ring-emerald-300/30"
                          : "bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 hover:border-emerald-300 hover:shadow-md"
                      }`}
                      onClick={() => {
                        setActiveCategoryId(c.id);
                        setActiveSubcategoryId("");
                        setSearchQuery("");
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.id === activeCategoryId && (
                          <span className="ml-1.5 rounded-full bg-white/30 px-2.5 py-1 text-xs font-bold backdrop-blur-sm">{itemCount}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Cart Drawer */}
        {showCart && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => {
              setShowCart(false);
              setShowCheckout(false);
            }}></div>
            <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4 backdrop-blur-sm">
                <h2 className="text-2xl font-bold text-slate-900">
                  {showCheckout ? 'Checkout' : 'Your Cart'}
                </h2>
                <button 
                  onClick={() => {
                    setShowCart(false);
                    setShowCheckout(false);
                  }} 
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600 transition-all hover:bg-slate-200 hover:scale-110"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                {showCheckout ? (
                  <CheckoutContent
                    cart={cart}
                    subtotal={subtotal}
                    customerName={customerName}
                    customerPhone={customerPhone}
                    setCustomerName={setCustomerName}
                    setCustomerPhone={setCustomerPhone}
                    message={message}
                    busy={busy}
                    placeOrder={placeOrder}
                    onBack={() => setShowCheckout(false)}
                    onViewHistory={fetchOrderHistory}
                    orderHistory={orderHistory}
                    showOrderHistory={showOrderHistory}
                    setShowOrderHistory={setShowOrderHistory}
                    loadingHistory={loadingHistory}
                  />
                ) : (
                  <CartReview
                    cart={cart}
                    updateQty={updateQty}
                    updateNotes={updateNotes}
                    subtotal={subtotal}
                    onCheckout={() => setShowCheckout(true)}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Menu Items - Enhanced Display */}
          <section className="lg:col-span-2">
            {/* Horizontal Sliding Subcategories - Below Categories when category is selected */}
            {activeCategoryId && !searchQuery && activeSubcategories.length > 0 && (
              <div className="mb-6">
                <div className="sticky top-28 z-20 -mx-4 px-4 bg-gradient-to-b from-white via-white to-transparent backdrop-blur-md pb-4 md:-mx-6 md:px-6">
                  <div className="category-scroll-container relative">
                    <div className="category-scroll flex gap-3 overflow-x-auto pb-3 px-1">
                      <button
                        onClick={() => setActiveSubcategoryId("")}
                        className={`flex-shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 whitespace-nowrap shadow-sm ${
                          !activeSubcategoryId
                            ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-blue-200/50 scale-105 ring-2 ring-blue-300/30"
                            : "bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-300 hover:shadow-md"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">📋</span>
                          <span>All</span>
                          {!activeSubcategoryId && (
                            <span className="ml-1.5 rounded-full bg-white/30 px-2.5 py-1 text-xs font-bold backdrop-blur-sm">
                              {items.filter((i) => i.categoryId === activeCategoryId && i.isEnabled !== false).length}
                            </span>
                          )}
                        </span>
                      </button>
                      {activeSubcategories.map((sub) => {
                        const subItemCount = items.filter((i) => i.subcategoryId === sub.id && i.isEnabled !== false).length;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setActiveSubcategoryId(sub.id)}
                            className={`flex-shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 whitespace-nowrap shadow-sm ${
                              sub.id === activeSubcategoryId
                                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-blue-200/50 scale-105 ring-2 ring-blue-300/30"
                                : "bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-300 hover:shadow-md"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{sub.name}</span>
                              {sub.id === activeSubcategoryId && (
                                <span className="ml-1.5 rounded-full bg-white/30 px-2.5 py-1 text-xs font-bold backdrop-blur-sm">{subItemCount}</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {visibleItems.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-16 text-center shadow-sm">
                <div className="mb-6 text-7xl animate-bounce">🔍</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {searchQuery ? "No items found" : "No items in this category"}
                </h3>
                <p className="text-base text-slate-600 mb-6">
                  {searchQuery 
                    ? `We couldn't find any items matching "${searchQuery}"` 
                    : "Check back later or browse other categories"}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-slate-800 hover:to-slate-700 hover:shadow-xl hover:scale-105"
                  >
                    Clear Search & Show All
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Group by category and subcategory */}
                {!activeCategoryId && !searchQuery ? (
                  // Show all categories with subcategories
                  categories.map((cat) => {
                    const categoryMap = itemsByCategory.get(cat.id);
                    if (!categoryMap || categoryMap.size === 0) return null;
                    
                    const categorySubcategories = subcategories
                      .filter((s) => s.categoryId === cat.id)
                      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
                    
                    return (
                      <div key={cat.id} className="space-y-6">
                        {/* Category Header */}
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-slate-900">{cat.name}</h3>
                          <div className="h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent"></div>
                        </div>
                        
                        {/* Items grouped by subcategory */}
                        {categorySubcategories.length > 0 && categorySubcategories.map((sub) => {
                          const subItems = categoryMap.get(sub.id) || [];
                          if (subItems.length === 0) return null;
                          return (
                            <div key={sub.id} className="space-y-3">
                              <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide px-2">
                                {sub.name}
                              </h4>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {subItems.map((it) => (
                                  <MenuItemCard 
                                    key={it.id} 
                                    item={it} 
                                    onAdd={addToCart}
                                    isAdded={addedItemId === it.id}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Items without subcategory - always show if they exist */}
                        {(() => {
                          const itemsWithoutSub = categoryMap.get(null) || [];
                          if (itemsWithoutSub.length === 0) return null;
                          return (
                            <div className="space-y-3">
                              {categorySubcategories.length > 0 && (
                                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide px-2">
                                  Other Items
                                </h4>
                              )}
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {itemsWithoutSub.map((it) => (
                                  <MenuItemCard 
                                    key={it.id} 
                                    item={it} 
                                    onAdd={addToCart}
                                    isAdded={addedItemId === it.id}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        
                        {/* If no subcategories exist, show all items directly */}
                        {categorySubcategories.length === 0 && (() => {
                          const allItems: MenuItem[] = [];
                          categoryMap.forEach((itemArray: MenuItem[]) => {
                            allItems.push(...itemArray);
                          });
                          if (allItems.length === 0) return null;
                          return (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {allItems.map((it) => (
                                <MenuItemCard 
                                  key={it.id} 
                                  item={it} 
                                  onAdd={addToCart}
                                  isAdded={addedItemId === it.id}
                                />
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                ) : activeCategoryId && !activeSubcategoryId ? (
                  // Show items in selected category, grouped by subcategory
                  (() => {
                    const categoryMap = itemsByCategory.get(activeCategoryId);
                    if (!categoryMap) return null;
                    
                    const categorySubcategories = subcategories
                      .filter((s) => s.categoryId === activeCategoryId)
                      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
                    
                    const itemsWithoutSub = categoryMap.get(null) || [];
                    const hasItems = categorySubcategories.some(sub => (categoryMap.get(sub.id) || []).length > 0) || itemsWithoutSub.length > 0;
                    
                    if (!hasItems) return null;
                    
                    return (
                      <div className="space-y-6">
                        {categorySubcategories.map((sub) => {
                          const subItems = categoryMap.get(sub.id) || [];
                          if (subItems.length === 0) return null;
                          return (
                            <div key={sub.id} className="space-y-3">
                              <h4 className="text-base font-semibold text-slate-700 px-1">
                                {sub.name}
                              </h4>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {subItems.map((it) => (
                                  <MenuItemCard 
                                    key={it.id} 
                                    item={it} 
                                    onAdd={addToCart}
                                    isAdded={addedItemId === it.id}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Items without subcategory */}
                        {itemsWithoutSub.length > 0 && (
                          <div className="space-y-3">
                            {categorySubcategories.length > 0 && (
                              <h4 className="text-base font-semibold text-slate-700 px-1">
                                Other Items
                              </h4>
                            )}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {itemsWithoutSub.map((it) => (
                                <MenuItemCard 
                                  key={it.id} 
                                  item={it} 
                                  onAdd={addToCart}
                                  isAdded={addedItemId === it.id}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  // Show filtered items (search or specific subcategory)
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {visibleItems.map((it) => (
                      <MenuItemCard 
                        key={it.id} 
                        item={it} 
                        onAdd={addToCart}
                        isAdded={addedItemId === it.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Desktop Cart Sidebar */}
          <aside id="cart-section" className="hidden lg:block lg:col-span-1">
            <div className="sticky top-20 rounded-2xl border-2 border-slate-200 bg-white shadow-xl overflow-hidden">
              {showCheckout ? (
                <div className="p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200"
                    >
                      ←
                    </button>
                    <h2 className="text-xl font-bold text-slate-900">Checkout</h2>
                  </div>
                  <CheckoutContent
                    cart={cart}
                    subtotal={subtotal}
                    customerName={customerName}
                    customerPhone={customerPhone}
                    setCustomerName={setCustomerName}
                    setCustomerPhone={setCustomerPhone}
                    message={message}
                    busy={busy}
                    placeOrder={placeOrder}
                    onBack={() => setShowCheckout(false)}
                  />
                </div>
              ) : (
                <CartReview
                  cart={cart}
                  updateQty={updateQty}
                  updateNotes={updateNotes}
                  subtotal={subtotal}
                  onCheckout={() => setShowCheckout(true)}
                />
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
    </>
  );
}

// Menu Item Card Component - Minimal & Clean
function MenuItemCard({ item, onAdd, isAdded }: { item: MenuItem; onAdd: (item: MenuItem) => void; isAdded?: boolean }) {
  return (
    <button
      className={`menu-item-card group relative overflow-hidden rounded-xl border ${
        isAdded 
          ? "border-emerald-500 bg-emerald-50 shadow-md item-added" 
          : "border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md"
      } p-4 text-left transition-all duration-200`}
      onClick={() => onAdd(item)}
    >
      <div className="flex items-start gap-3">
        {item.isVeg !== undefined && (
          <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center mt-0.5 ${
            item.isVeg ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}>
            <span className={`text-[10px] font-bold ${item.isVeg ? "text-green-600" : "text-red-600"}`}>
              {item.isVeg ? "V" : "NV"}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-emerald-700 line-clamp-2 transition-colors leading-tight">
            {item.name}
          </h3>
          {item.description && (
            <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-lg font-bold text-emerald-600">
              ₹{Number(item.price).toFixed(0)}
            </span>
            <div className="flex-shrink-0">
              <div className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                isAdded 
                  ? "bg-emerald-600 text-white" 
                  : "bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-700"
              }`}>
                {isAdded ? "✓ Added" : "+ Add"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// Cart Review Component - Simple, attractive cart view
function CartReview({
  cart,
  updateQty,
  updateNotes,
  subtotal,
  onCheckout
}: {
  cart: CartLine[];
  updateQty: (id: string, qty: number) => void;
  updateNotes: (id: string, notes: string) => void;
  subtotal: number;
  onCheckout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-5 text-white">
        <h2 className="text-2xl font-bold mb-1">Your Cart</h2>
        <p className="text-sm text-emerald-50">{cart.length} {cart.length === 1 ? 'item' : 'items'} selected</p>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 max-h-[50vh]">
        {cart.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mb-6 text-7xl animate-bounce">🛒</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h3>
            <p className="text-base text-slate-600 mb-4">Browse the menu and add delicious items to get started</p>
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <span>👆</span>
              <span className="text-sm">Tap items to add them</span>
            </div>
          </div>
        ) : (
          cart.map((c, idx) => (
            <div 
              key={c.menuItemId} 
              className="group rounded-xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-emerald-300 hover:shadow-lg"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span>{c.nameSnapshot}</span>
                    {c.notes && (
                      <span className="text-xs text-emerald-600 font-normal">💬</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">₹ {c.priceSnapshot.toFixed(2)} each</div>
                </div>
                <div className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  ₹ {(c.qty * c.priceSnapshot).toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-700 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95"
                  onClick={() => updateQty(c.menuItemId, c.qty - 1)}
                >
                  −
                </button>
                <span className="w-12 text-center text-base font-bold text-slate-900">{c.qty}</span>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-lg font-bold text-emerald-700 transition-all hover:bg-emerald-200 hover:scale-110 active:scale-95"
                  onClick={() => updateQty(c.menuItemId, c.qty + 1)}
                >
                  +
                </button>
                <button
                  className="ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-50"
                  onClick={() => updateQty(c.menuItemId, 0)}
                >
                  ✕ Remove
                </button>
              </div>

              <textarea
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all"
                value={c.notes}
                onChange={(e) => updateNotes(c.menuItemId, e.target.value)}
                placeholder="💬 Special instructions (optional)"
                rows={2}
              />
            </div>
          ))
        )}
      </div>

      {/* Footer with Total and Checkout */}
      {cart.length > 0 && (
        <div className="border-t-2 border-slate-200 bg-slate-50 p-5 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white">
            <span className="text-lg font-bold">Total</span>
            <span className="text-3xl font-bold">₹ {subtotal.toFixed(2)}</span>
          </div>

          <button
            onClick={onCheckout}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-green-700 hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="text-lg">🛒</span>
              <span>Proceed to Checkout</span>
              <span className="text-lg">→</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// Checkout Content Component - Clean checkout form
function CheckoutContent({
  cart,
  subtotal,
  customerName,
  customerPhone,
  setCustomerName,
  setCustomerPhone,
  message,
  busy,
  placeOrder,
  onBack,
  onViewHistory,
  orderHistory,
  showOrderHistory,
  setShowOrderHistory,
  loadingHistory
}: {
  cart: CartLine[];
  subtotal: number;
  customerName: string;
  customerPhone: string;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  message: string | null;
  busy: boolean;
  placeOrder: () => void;
  onBack: () => void;
  onViewHistory?: (phone: string) => void;
  orderHistory?: any[];
  showOrderHistory?: boolean;
  setShowOrderHistory?: (show: boolean) => void;
  loadingHistory?: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Order Summary */}
      <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-700 uppercase tracking-wide">Order Summary</h3>
        <div className="space-y-2">
          {cart.map((c) => (
            <div key={c.menuItemId} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                {c.nameSnapshot} <span className="text-slate-400">× {c.qty}</span>
              </span>
              <span className="font-semibold text-slate-900">₹ {(c.qty * c.priceSnapshot).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t-2 border-slate-300 pt-3">
          <span className="text-base font-bold text-slate-900">Total</span>
          <span className="text-xl font-bold text-emerald-600">₹ {subtotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Order History Modal */}
      {showOrderHistory && orderHistory && orderHistory.length > 0 && (
        <div className="mb-5 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-emerald-900">📜 Previous Orders</h4>
            <button
              onClick={() => setShowOrderHistory?.(false)}
              className="text-emerald-700 hover:text-emerald-900 text-lg"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {orderHistory.map((order: any) => (
              <div key={order.id} className="rounded-lg border border-emerald-200 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-600">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    order.status === 'READY' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'PREPARING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="space-y-1 mb-2">
                  {order.items.slice(0, 3).map((item: any, idx: number) => (
                    <div key={idx} className="text-xs text-slate-700">
                      {item.qty}x {item.name}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="text-xs text-slate-500">+{order.items.length - 3} more items</div>
                  )}
                </div>
                <div className="text-sm font-bold text-emerald-700">
                  Total: ₹ {order.total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Info */}
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Your Name <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 transition-all"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-semibold text-slate-700">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            {customerPhone && customerPhone.trim().length >= 8 && onViewHistory && (
              <button
                type="button"
                onClick={() => onViewHistory(customerPhone)}
                disabled={loadingHistory}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {loadingHistory ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></span>
                    Loading...
                  </>
                ) : (
                  <>📜 View Previous Orders</>
                )}
              </button>
            )}
          </div>
          <input
            type="tel"
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 transition-all"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="10-digit mobile number"
            required
          />
          <p className="mt-2 text-xs text-slate-500">We'll send order updates to this number</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl p-4 text-sm font-medium ${
            message.includes("Success") || message.includes("placed")
              ? "bg-green-50 text-green-800 border-2 border-green-200"
              : "bg-red-50 text-red-800 border-2 border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* Place Order Button */}
      <div className="space-y-3">
        <button
          disabled={busy || cart.length === 0 || !customerPhone || customerPhone.trim().length < 8}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4 text-lg font-bold text-white shadow-xl transition-all hover:from-emerald-700 hover:to-green-700 hover:shadow-2xl hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          onClick={placeOrder}
        >
          {busy ? (
            <span className="flex items-center justify-center gap-3">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Placing Your Order...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              <span className="text-xl">📤</span>
              <span>Place Order</span>
            </span>
          )}
        </button>

        <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-4 text-center">
          <p className="text-sm font-semibold text-blue-900">
            💳 <strong>Pay at counter</strong> after your food is served
          </p>
        </div>
      </div>
    </div>
  );
}
