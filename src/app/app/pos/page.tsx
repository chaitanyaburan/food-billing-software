"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useToast } from "@/lib/client/toast";
import { apiFetch } from "@/lib/client/api";
import { computeTotals } from "@/lib/billing/gst";

type Mode = "ORDER_FIRST" | "DIRECT_BILL" | "TABLE_ORDERS";

type Order = {
  id: string;
  tableNo: string | null;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    nameSnapshot: string;
    priceSnapshot: number;
    qty: number;
    menuItemId: string;
  }>;
};

type MenuCategory = { id: string; name: string };
type MenuItem = { id: string; categoryId: string; name: string; price: any; isEnabled: boolean; isVeg?: boolean };
type Table = { id: string; tableNo: string; isEnabled: boolean };
type Restaurant = {
  gstMode: "CGST_SGST" | "IGST";
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
};

type CartLine = {
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  qty: number;
};

export default function PosPage() {
  const [mode, setMode] = useState<Mode>("ORDER_FIRST");
  const [invoiceType, setInvoiceType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">("DINE_IN");
  const [selectedTableNo, setSelectedTableNo] = useState<string>("");

  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [paymentRef, setPaymentRef] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [lastPrintPath, setLastPrintPath] = useState<string | null>(null);
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);

  // Table Orders mode state
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [loadingOrders, setLoadingOrders] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    Promise.all([
      apiFetch<{ tables: Table[] }>("/api/setup/tables").then((r) => (r.ok ? setTables(r.data.tables) : null)),
      apiFetch<{ categories: MenuCategory[] }>("/api/menu/categories").then((r) => {
        if (r.ok) {
          const cats = r.data.categories;
          setCategories(cats);
          if (cats[0]?.id) setActiveCategoryId(cats[0].id);
        }
      }),
      apiFetch<{ items: MenuItem[] }>("/api/menu/items").then((r) => (r.ok ? setItems(r.data.items) : null)),
      apiFetch<{ restaurant: Restaurant }>("/api/setup/restaurant").then((r) => {
        if (r.ok) {
          setRestaurant({
            gstMode: r.data.restaurant.gstMode,
            cgstRate: r.data.restaurant.cgstRate,
            sgstRate: r.data.restaurant.sgstRate,
            igstRate: r.data.restaurant.igstRate
          });
        }
      })
    ]);
  }, []);

  useEffect(() => {
    if (invoiceType !== "DINE_IN") setSelectedTableNo("");
  }, [invoiceType]);

  async function loadTableOrders() {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    setLoadingOrders(true);
    try {
      const url = selectedTableNo
        ? `/api/orders?tableNo=${encodeURIComponent(selectedTableNo)}`
        : "/api/orders";
      
      const res = await apiFetch<{ orders: Order[] }>(url);
      if (res.ok) {
        // Show all DINE_IN orders that are not cancelled
        // Keep orders visible even if they have linkedInvoiceId (until bill is printed)
        const openOrders = res.data.orders.filter(
          (o: any) => o.status !== "CANCELLED" && o.type === "DINE_IN"
        );
        setTableOrders(openOrders);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  }

  // Load table orders when in TABLE_ORDERS mode
  useEffect(() => {
    if (mode !== "TABLE_ORDERS") {
      setTableOrders([]);
      setSelectedOrder(null);
      setSelectedOrderId("");
      return;
    }

    loadTableOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedTableNo]);

  function loadOrderIntoCart(order: Order) {
    setSelectedOrder(order);
    setSelectedOrderId(order.id);
    
    // Convert order items to cart items
    const cartItems: CartLine[] = order.items.map((item) => ({
      menuItemId: item.menuItemId,
      nameSnapshot: item.nameSnapshot,
      priceSnapshot: Number(item.priceSnapshot),
      qty: item.qty
    }));
    
    setCart(cartItems);
    setCustomerName(order.customerName || "");
    setCustomerPhone(order.customerPhone || "");
    
    // Set table number
    if (order.tableNo) {
      setSelectedTableNo(order.tableNo);
      setInvoiceType("DINE_IN");
    }
    
    toast.push({ variant: "success", message: "Order loaded into cart" });
  }

  async function updateOrderItems() {
    if (!selectedOrder) {
      toast.push({ variant: "error", message: "No order selected" });
      return;
    }

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      toast.push({ variant: "error", message: "Authentication required" });
      return;
    }

    if (cart.length === 0) {
      toast.push({ variant: "error", message: "Cart is empty" });
      return;
    }

    setBusy(true);
    try {
      // First, get current order items to compare
      const currentOrderRes = await apiFetch<{ order: Order }>(`/api/orders/${selectedOrder.id}`);
      if (!currentOrderRes.ok) {
        toast.push({ variant: "error", message: "Failed to fetch order details" });
        return;
      }

      const currentOrder = currentOrderRes.data.order;
      const currentItemIds = new Set(currentOrder.items.map((i) => i.menuItemId));
      const newItemIds = new Set(cart.map((c) => c.menuItemId));

      // Find items to add (in cart but not in order)
      const itemsToAdd = cart.filter((c) => !currentItemIds.has(c.menuItemId));
      
      // Find items to update (in both, but quantity changed)
      const itemsToUpdate = cart.filter((c) => {
        const existing = currentOrder.items.find((i) => i.menuItemId === c.menuItemId);
        return existing && existing.qty !== c.qty;
      });

      // Find items to remove (in order but not in cart)
      const itemsToRemove = currentOrder.items.filter((i) => !newItemIds.has(i.menuItemId));

      // Add new items
      if (itemsToAdd.length > 0) {
        await apiFetch(`/api/orders/${selectedOrder.id}/items`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: itemsToAdd.map((c) => ({
              menuItemId: c.menuItemId,
              nameSnapshot: c.nameSnapshot,
              priceSnapshot: c.priceSnapshot,
              qty: c.qty,
              notes: ""
            }))
          })
        });
      }

      // Update quantities (remove and re-add with new quantity)
      for (const item of itemsToUpdate) {
        const existing = currentOrder.items.find((i) => i.menuItemId === item.menuItemId);
        if (existing) {
          // Remove old item
          await apiFetch(`/api/orders/${selectedOrder.id}/items/${existing.id}`, {
            method: "DELETE"
          });
          // Add with new quantity
          await apiFetch(`/api/orders/${selectedOrder.id}/items`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              items: [{
                menuItemId: item.menuItemId,
                nameSnapshot: item.nameSnapshot,
                priceSnapshot: item.priceSnapshot,
                qty: item.qty,
                notes: ""
              }]
            })
          });
        }
      }

      // Remove items
      for (const item of itemsToRemove) {
        await apiFetch(`/api/orders/${selectedOrder.id}/items/${item.id}`, {
          method: "DELETE"
        });
      }

      toast.push({ variant: "success", message: "Order updated successfully" });
      await loadTableOrders();
      
      // Reload the selected order
      const updatedRes = await apiFetch<{ order: Order }>(`/api/orders/${selectedOrder.id}`);
      if (updatedRes.ok) {
        loadOrderIntoCart(updatedRes.data.order);
      }
    } catch (err) {
      console.error(err);
      toast.push({ variant: "error", message: "Failed to update order" });
    } finally {
      setBusy(false);
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on Ctrl+F or Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Clear search on Escape
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
        return;
      }

      // Clear cart on Ctrl+Shift+C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        handleClearCart();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const visibleItems = useMemo(() => {
    let filtered = items.filter((i) => i.isEnabled !== false);
    
    if (activeCategoryId) {
      filtered = filtered.filter((i) => i.categoryId === activeCategoryId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(query));
    }

    return filtered;
  }, [items, activeCategoryId, searchQuery]);

  const subtotal = useMemo(
    () => cart.reduce((sum, it) => sum + it.qty * it.priceSnapshot, 0),
    [cart]
  );

  const totals = useMemo(() => {
    if (!restaurant) {
      return {
        subtotal,
        discountAmount: discountValue > 0 ? (discountType === "FLAT" ? discountValue : (subtotal * discountValue) / 100) : 0,
        taxable: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        total: 0
      };
    }

    return computeTotals({
      subtotal,
      discount: discountValue > 0 ? { type: discountType, value: discountValue } : undefined,
      gstMode: restaurant.gstMode,
      cgstRate: restaurant.cgstRate,
      sgstRate: restaurant.sgstRate,
      igstRate: restaurant.igstRate
    });
  }, [subtotal, discountType, discountValue, restaurant]);

  function addToCart(mi: MenuItem) {
    setLastPrintPath(null);
    const price = Number(mi.price);
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
          qty: 1
        }
      ];
    });
    toast.push({ variant: "success", message: `Added ${mi.name}` });
  }

  function updateQty(menuItemId: string, qty: number) {
    setCart((prev) => {
      const nextQty = Math.max(0, qty);
      if (nextQty === 0) return prev.filter((x) => x.menuItemId !== menuItemId);
      return prev.map((x) => (x.menuItemId === menuItemId ? { ...x, qty: nextQty } : x));
    });
  }

  function handleClearCart() {
    if (cart.length === 0) return;
    setCart([]);
    setDiscountValue(0);
    toast.push({ variant: "default", message: "Cart cleared" });
  }

  async function sendToKitchen() {
    setLastPrintPath(null);
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      toast.push({ variant: "error", message: "Authentication required" });
      return;
    }
    if (invoiceType === "DINE_IN" && !selectedTableNo) {
      toast.push({ variant: "error", message: "Please select a table" });
      return;
    }
    if (cart.length === 0) {
      toast.push({ variant: "error", message: "Cart is empty" });
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch<{ order: any }>("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: invoiceType,
          tableNo: invoiceType === "DINE_IN" ? selectedTableNo : undefined,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            nameSnapshot: c.nameSnapshot,
            priceSnapshot: c.priceSnapshot,
            qty: c.qty,
            modifiers: [],
            notes: ""
          }))
        })
      });

      if (!res.ok) {
        toast.push({ variant: "error", message: res.error?.message || "Failed to send order to kitchen" });
        return;
      }

      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      toast.push({ variant: "success", message: "Order sent to kitchen!" });
    } finally {
      setBusy(false);
    }
  }

  async function generateDirectBill() {
    setLastPrintPath(null);
    setLastInvoiceId(null);
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      toast.push({ variant: "error", message: "Authentication required" });
      return;
    }
    if (invoiceType === "DINE_IN" && !selectedTableNo) {
      toast.push({ variant: "error", message: "Please select a table" });
      return;
    }
    if (cart.length === 0) {
      toast.push({ variant: "error", message: "Cart is empty" });
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch<{ invoice: any }>("/api/billing/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceType,
          tableNo: invoiceType === "DINE_IN" ? selectedTableNo : undefined,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          items: cart.map((c) => ({ name: c.nameSnapshot, qty: c.qty, price: c.priceSnapshot })),
          discount: discountValue > 0 ? { type: discountType, value: discountValue } : undefined,
          payment: { mode: paymentMode, amount: totals.total, reference: paymentRef || undefined }
        })
      });

      if (!res.ok) {
        toast.push({ variant: "error", message: res.error?.message || "Failed to generate bill" });
        return;
      }

      const invoiceId = res.data?.invoice?.id;
      if (invoiceId) {
        setLastInvoiceId(invoiceId);
        setLastPrintPath(`/app/print/invoice/${invoiceId}`);
      }
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscountValue(0);
      toast.push({ variant: "success", message: "Bill generated successfully!" });
    } finally {
      setBusy(false);
    }
  }

  async function generateBillForTable() {
    setLastPrintPath(null);
    setLastInvoiceId(null);
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      toast.push({ variant: "error", message: "Authentication required" });
      return;
    }
    if (invoiceType !== "DINE_IN" || !selectedTableNo) {
      toast.push({ variant: "error", message: "Please select a table" });
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch<{ invoiceId?: string; printPath?: string }>("/api/billing/settle-table", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tableNo: selectedTableNo,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          discount: discountValue > 0 ? { type: discountType, value: discountValue } : undefined,
          payment: { mode: paymentMode, amount: totals.total, reference: paymentRef || undefined }
        })
      });

      if (!res.ok) {
        toast.push({ variant: "error", message: res.error?.message || "Failed to settle table" });
        return;
      }

      const invoiceId = res.data?.invoiceId ?? null;
      if (invoiceId) setLastInvoiceId(invoiceId);
      setLastPrintPath(res.data?.printPath ?? null);
      setCustomerName("");
      setCustomerPhone("");
      setDiscountValue(0);
      toast.push({ variant: "success", message: "Table billed successfully!" });
    } finally {
      setBusy(false);
    }
  }

  async function sendInvoiceSms() {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      toast.push({ variant: "error", message: "Authentication required" });
      return;
    }
    if (!lastInvoiceId) {
      toast.push({ variant: "error", message: "No invoice available" });
      return;
    }
    if (!customerPhone) {
      toast.push({ variant: "error", message: "Customer phone number required" });
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch(`/api/billing/invoices/${lastInvoiceId}/deliver`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel: "SMS", toPhone: customerPhone })
      });

      if (!res.ok) {
        toast.push({ variant: "error", message: res.error?.message || "Failed to send SMS" });
        return;
      }
      toast.push({ variant: "success", message: "SMS queued for delivery" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Point of Sale</h1>
          <div className="flex flex-wrap items-center gap-2">
            {lastPrintPath ? (
              <a
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                href={lastPrintPath}
                target="_blank"
              >
                🖨️ Print Invoice
              </a>
            ) : null}
            {lastInvoiceId && customerPhone ? (
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                disabled={busy}
                onClick={sendInvoiceSms}
              >
                📱 Send SMS
              </button>
            ) : null}
          </div>
        </div>

        {/* Main Grid */}
        {mode === "TABLE_ORDERS" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {/* Left: Orders List or Menu Selection */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
              {!selectedOrder ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-slate-700">Filter by Table:</label>
                      <select
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        value={selectedTableNo}
                        onChange={(e) => setSelectedTableNo(e.target.value)}
                      >
                        <option value="">All Tables</option>
                        {tables
                          .filter((t) => t.isEnabled !== false)
                          .map((t) => (
                            <option key={t.id} value={t.tableNo}>
                              {t.tableNo}
                            </option>
                          ))}
                      </select>
                    </div>
                    <button
                      onClick={loadTableOrders}
                      disabled={loadingOrders}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      {loadingOrders ? "Loading..." : "🔄 Refresh"}
                    </button>
                  </div>

                  {loadingOrders ? (
                    <div className="py-12 text-center text-slate-500">Loading orders...</div>
                  ) : tableOrders.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">
                      {selectedTableNo ? `No open orders for table ${selectedTableNo}` : "No open orders"}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {tableOrders.map((order) => (
                        <div
                          key={order.id}
                          className={`rounded-lg border-2 p-4 transition-all cursor-pointer ${
                            selectedOrderId === order.id
                              ? "border-emerald-500 bg-emerald-50"
                              : (order as any).linkedInvoiceId
                              ? "border-amber-300 bg-amber-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                          onClick={() => loadOrderIntoCart(order)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-slate-900">
                                  Table: {order.tableNo || "N/A"}
                                </span>
                                {(order as any).linkedInvoiceId && (
                                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
                                    Billed
                                  </span>
                                )}
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  order.status === "PLACED" ? "bg-blue-100 text-blue-700" :
                                  order.status === "PREPARING" ? "bg-yellow-100 text-yellow-700" :
                                  order.status === "READY" ? "bg-green-100 text-green-700" :
                                  "bg-slate-100 text-slate-700"
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                              {order.customerName && (
                                <div className="text-xs text-slate-600 mb-1">Customer: {order.customerName}</div>
                              )}
                              <div className="text-xs text-slate-500 mb-2">
                                {new Date(order.createdAt).toLocaleString()}
                              </div>
                              <div className="space-y-1">
                                {order.items.slice(0, 3).map((item) => (
                                  <div key={item.id} className="text-sm text-slate-700">
                                    {item.nameSnapshot} × {item.qty}
                                  </div>
                                ))}
                                {order.items.length > 3 && (
                                  <div className="text-xs text-slate-500">+{order.items.length - 3} more items</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-slate-900">
                                ₹ {order.items.reduce((sum, item) => sum + Number(item.priceSnapshot) * item.qty, 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Back button to deselect order */}
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        setSelectedOrder(null);
                        setSelectedOrderId("");
                        setCart([]);
                      }}
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                      ← Back to Orders
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="mb-4">
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="🔍 Search items (Ctrl+F)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Categories & Items */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Categories */}
                    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-sm font-semibold text-slate-700">Categories</p>
                      <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                        {categories.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setActiveCategoryId(c.id)}
                            className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                              activeCategoryId === c.id
                                ? "bg-slate-900 text-white"
                                : "bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Items */}
                    <section className="md:col-span-2">
                      <p className="mb-2 text-sm font-semibold text-slate-700">
                        {activeCategoryId ? categories.find((c) => c.id === activeCategoryId)?.name || "Items" : "All Items"}
                      </p>
                      <div className="grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                        {visibleItems.length === 0 ? (
                          <div className="col-span-full py-8 text-center text-sm text-slate-500">
                            No items found
                          </div>
                        ) : (
                          visibleItems.map((it) => (
                            <button
                              key={it.id}
                              onClick={() => addToCart(it)}
                              className="group rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:border-slate-300 hover:shadow-md"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-slate-900 group-hover:text-slate-950">{it.name}</div>
                                <div className="mt-1 text-xs font-semibold text-slate-600">₹ {Number(it.price).toFixed(2)}</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                </>
              )}
            </div>
            {/* Cart sidebar for TABLE_ORDERS mode */}
            <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Cart ({cart.length})</p>
                {cart.length > 0 && (
                  <button
                    className="text-xs text-red-600 hover:text-red-700"
                    onClick={handleClearCart}
                    title="Clear cart"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="mb-4 space-y-2 max-h-[200px] overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">Cart is empty</p>
                ) : (
                  cart.map((c) => (
                    <div key={c.menuItemId} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium truncate">{c.nameSnapshot}</span>
                        <span className="font-semibold">₹ {(c.qty * c.priceSnapshot).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="rounded border px-1.5 py-0.5 text-xs hover:bg-slate-100" onClick={() => updateQty(c.menuItemId, c.qty - 1)}>−</button>
                        <span className="w-6 text-center text-xs">{c.qty}</span>
                        <button className="rounded border px-1.5 py-0.5 text-xs hover:bg-slate-100" onClick={() => updateQty(c.menuItemId, c.qty + 1)}>+</button>
                        <button className="ml-auto text-xs text-red-600" onClick={() => updateQty(c.menuItemId, 0)}>Remove</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mb-4 space-y-1.5 border-t pt-3 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹ {totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Total</span>
                  <span>₹ {totals.total.toFixed(2)}</span>
                </div>
              </div>
              {selectedOrder ? (
                <div className="space-y-2">
                  <button
                    disabled={busy || cart.length === 0}
                    className="w-full rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    onClick={updateOrderItems}
                  >
                    {busy ? "Saving..." : "💾 Update Order"}
                  </button>
                  {(selectedOrder as any)?.linkedInvoiceId ? (
                    <div className="space-y-2">
                      <div className="rounded bg-amber-50 border border-amber-200 p-2 mb-2">
                        <p className="text-xs text-amber-800 font-medium">This order has been billed.</p>
                      </div>
                      <button
                        onClick={() => {
                          if (lastPrintPath) {
                            window.open(lastPrintPath, "_blank");
                          } else if ((selectedOrder as any).linkedInvoiceId) {
                            window.open(`/app/print/invoice/${(selectedOrder as any).linkedInvoiceId}`, "_blank");
                          }
                        }}
                        className="w-full rounded bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                      >
                        🖨️ Print Bill Again
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={busy || !selectedTableNo}
                      className="w-full rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                      onClick={async () => {
                        await generateBillForTable();
                        // Reload orders to show updated status
                        await loadTableOrders();
                        // Reload selected order to get updated linkedInvoiceId
                        if (selectedOrder?.id) {
                          const updatedRes = await apiFetch<{ order: Order }>(`/api/orders/${selectedOrder.id}`);
                          if (updatedRes.ok) {
                            loadOrderIntoCart(updatedRes.data.order);
                            if (lastPrintPath) {
                              window.open(lastPrintPath, "_blank");
                            }
                          }
                        }
                      }}
                    >
                      {busy ? "Processing..." : "🖨️ Print Bill"}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-center text-xs text-slate-500 py-2">Select an order</p>
              )}
            </aside>
          </div>
        ) : null}

        {mode !== "TABLE_ORDERS" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {/* Left: Menu Selection */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
            {/* Controls Bar */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">Mode:</label>
                <select
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as Mode)}
                >
                  <option value="ORDER_FIRST">Order → Kitchen → Bill</option>
                  <option value="DIRECT_BILL">Direct Bill</option>
                  <option value="TABLE_ORDERS">Table Orders</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">Type:</label>
                <select
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as any)}
                >
                  <option value="DINE_IN">Dine-in</option>
                  <option value="TAKEAWAY">Takeaway</option>
                  <option value="DELIVERY">Delivery</option>
                </select>
              </div>

              {invoiceType === "DINE_IN" ? (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Table:</label>
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    value={selectedTableNo}
                    onChange={(e) => setSelectedTableNo(e.target.value)}
                  >
                    <option value="">Select table</option>
                    {tables
                      .filter((t) => t.isEnabled !== false)
                      .map((t) => (
                        <option key={t.id} value={t.tableNo}>
                          {t.tableNo}
                        </option>
                      ))}
                  </select>
                </div>
              ) : null}
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="🔍 Search items (Ctrl+F)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Categories & Items */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Categories */}
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-700">Categories</p>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        c.id === activeCategoryId
                          ? "bg-slate-900 font-medium text-white"
                          : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                      }`}
                      onClick={() => {
                        setActiveCategoryId(c.id);
                        setSearchQuery("");
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </section>

              {/* Items Grid */}
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Items {searchQuery ? `(${visibleItems.length} found)` : `(${visibleItems.length})`}
                </p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 max-h-[500px] overflow-y-auto">
                  {visibleItems.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-sm text-slate-500">
                      {searchQuery ? "No items found" : "No items in this category"}
                    </div>
                  ) : (
                    visibleItems.map((it) => (
                      <button
                        key={it.id}
                        className="group rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:border-slate-400 hover:shadow-md"
                        onClick={() => addToCart(it)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          {it.isVeg !== undefined && (
                            <span className={`text-xs ${it.isVeg ? "text-green-600" : "text-red-600"}`}>
                              {it.isVeg ? "🟢" : "🔴"}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900 group-hover:text-slate-950">{it.name}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-600">₹ {Number(it.price).toFixed(2)}</div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
          {/* Right: Cart & Checkout */}
          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Cart ({cart.length})</p>
              {cart.length > 0 && (
                <button
                  className="text-xs text-red-600 hover:text-red-700"
                  onClick={handleClearCart}
                  title="Clear cart (Ctrl+Shift+C)"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Cart Items */}
            <div className="mb-4 space-y-2 max-h-[300px] overflow-y-auto">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Cart is empty</p>
              ) : (
                cart.map((c) => (
                  <div key={c.menuItemId} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">{c.nameSnapshot}</div>
                        <div className="text-xs text-slate-600">₹ {c.priceSnapshot.toFixed(2)} each</div>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">₹ {(c.qty * c.priceSnapshot).toFixed(2)}</div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm hover:bg-slate-50"
                        onClick={() => updateQty(c.menuItemId, c.qty - 1)}
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{c.qty}</span>
                      <button
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm hover:bg-slate-50"
                        onClick={() => updateQty(c.menuItemId, c.qty + 1)}
                      >
                        +
                      </button>
                      <button
                        className="ml-auto text-xs text-red-600 hover:text-red-700"
                        onClick={() => updateQty(c.menuItemId, 0)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer Info */}
            <div className="mb-4 space-y-2 border-t border-slate-200 pt-4">
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name (optional)"
              />
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone (for SMS)"
              />
            </div>

            {/* Discount */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
              >
                <option value="FLAT">Flat ₹</option>
                <option value="PERCENT">Percent %</option>
              </select>
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                type="number"
                value={discountValue || ""}
                onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                placeholder="Discount"
                min="0"
              />
            </div>

            {/* Payment */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
              >
                <option value="CASH">💵 Cash</option>
                <option value="UPI">📱 UPI</option>
                <option value="CARD">💳 Card</option>
              </select>
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Ref (optional)"
              />
            </div>

            {/* Totals */}
            <div className="mb-4 space-y-1.5 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹ {totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>- ₹ {totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {totals.cgstAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>CGST</span>
                  <span>₹ {totals.cgstAmount.toFixed(2)}</span>
                </div>
              )}
              {totals.sgstAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>SGST</span>
                  <span>₹ {totals.sgstAmount.toFixed(2)}</span>
                </div>
              )}
              {totals.igstAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>IGST</span>
                  <span>₹ {totals.igstAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>Total</span>
                <span>₹ {totals.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {mode === "ORDER_FIRST" ? (
              <div className="space-y-2">
                <button
                  disabled={busy || cart.length === 0}
                  className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={sendToKitchen}
                >
                  {busy ? "Processing..." : "📤 Send to Kitchen (KOT)"}
                </button>
                <button
                  disabled={busy || !selectedTableNo}
                  className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={generateBillForTable}
                >
                  {busy ? "Processing..." : "💰 Generate Bill for Table"}
                </button>
              </div>
            ) : (
              <button
                disabled={busy || cart.length === 0}
                className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={generateDirectBill}
              >
                {busy ? "Processing..." : "💰 Generate Bill"}
              </button>
            )}
          </aside>
        </div>
        )}
      </div>
    </div>
  );
}
