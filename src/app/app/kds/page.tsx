"use client";

import { useEffect, useState, useRef } from "react";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  isEnabled: boolean;
};

type Category = {
  id: string;
  name: string;
  isEnabled?: boolean;
};

export default function KdsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "DINE_IN" | "TAKEAWAY" | "DELIVERY">("ALL");
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [addingItems, setAddingItems] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const previousOrderCountRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioEnabledRef = useRef<boolean>(false);

  // Function to enable audio (must be called after user interaction)
  async function enableAudio() {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // Resume audio context if suspended (required for autoplay policies)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      audioEnabledRef.current = true;
    } catch (err) {
      console.error("Failed to enable audio:", err);
    }
  }

  // Function to play notification sound
  function playNotificationSound() {
    try {
      // Only play if audio is enabled
      if (!audioEnabledRef.current) {
        return;
      }

      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {
          // If resume fails, audio is not enabled yet
          audioEnabledRef.current = false;
        });
        return;
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const now = audioContext.currentTime;
      
      // Create a loud, attention-grabbing notification tone (three beeps)
      // First beep
      oscillator.frequency.setValueAtTime(1000, now);
      oscillator.frequency.setValueAtTime(1200, now + 0.1);
      oscillator.frequency.setValueAtTime(1000, now + 0.2);
      
      // Second beep
      oscillator.frequency.setValueAtTime(900, now + 0.3);
      oscillator.frequency.setValueAtTime(1100, now + 0.4);
      oscillator.frequency.setValueAtTime(900, now + 0.5);
      
      // Third beep
      oscillator.frequency.setValueAtTime(1000, now + 0.6);
      oscillator.frequency.setValueAtTime(1200, now + 0.7);
      oscillator.frequency.setValueAtTime(1000, now + 0.8);

      // Much louder volume - set to 0.9 (near maximum)
      gainNode.gain.setValueAtTime(0.9, now);
      gainNode.gain.setValueAtTime(0.9, now + 0.2);
      gainNode.gain.setValueAtTime(0.9, now + 0.5);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

      oscillator.start(now);
      oscillator.stop(now + 0.9);
    } catch (err) {
      console.error("Failed to play notification sound:", err);
    }
  }

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");

    const load = async () => {
      try {
        const response = await fetch("/api/orders", {
          headers: { authorization: `Bearer ${accessToken}` }
        });
        const json = await response.json();
        const newOrders = json.data?.orders ?? [];
        
        // Check if there are new orders
        const currentOrderCount = newOrders.length;
        const previousOrderCount = previousOrderCountRef.current;
        
        // If order count increased, play sound
        if (previousOrderCount > 0 && currentOrderCount > previousOrderCount) {
          playNotificationSound();
        }
        
        previousOrderCountRef.current = currentOrderCount;
        setOrders(newOrders);
      } catch (err) {
        console.error("Failed to load orders:", err);
      }
    };

    load();

    if (!accessToken) return;

    const es = new EventSource(`/api/kds/stream?token=${encodeURIComponent(accessToken)}`);

    const onOrderCreated = () => {
      playNotificationSound();
      load();
    };

    const onOrderUpdated = () => {
      load();
    };

    es.addEventListener("ORDER_CREATED", onOrderCreated);
    es.addEventListener("ORDER_UPDATED", onOrderUpdated);

    // Auto-refresh every 5 seconds
    const refreshInterval = setInterval(() => {
      load();
    }, 5000);

    return () => {
      es.close();
      clearInterval(refreshInterval);
    };
  }, []);

  // Load menu items and categories when modal opens
  useEffect(() => {
    if (!showAddItemsModal) return;

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    Promise.all([
      fetch("/api/menu/items", {
        headers: { authorization: `Bearer ${accessToken}` }
      })
        .then((r) => r.json())
        .then((j) => setMenuItems(j.data?.items?.filter((i: MenuItem) => i.isEnabled) ?? [])),
      fetch("/api/menu/categories", {
        headers: { authorization: `Bearer ${accessToken}` }
      })
        .then((r) => r.json())
        .then((j) => setCategories(j.data?.categories?.filter((c: Category) => c.isEnabled) ?? []))
    ]).catch(console.error);
  }, [showAddItemsModal]);

  async function setStatus(orderId: string, status: "PLACED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED") {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ status })
    });
  }

  function openAddItemsModal(order: any) {
    setSelectedOrder(order);
    setSelectedItems(new Map());
    setSelectedCategoryId("");
    setShowAddItemsModal(true);
  }

  function closeAddItemsModal() {
    setShowAddItemsModal(false);
    setSelectedOrder(null);
    setSelectedItems(new Map());
    setSelectedCategoryId("");
  }

  function toggleItem(itemId: string) {
    const newMap = new Map(selectedItems);
    if (newMap.has(itemId)) {
      const current = newMap.get(itemId)!;
      if (current > 1) {
        newMap.set(itemId, current - 1);
      } else {
        newMap.delete(itemId);
      }
    } else {
      newMap.set(itemId, 1);
    }
    setSelectedItems(newMap);
  }

  function incrementItem(itemId: string) {
    const newMap = new Map(selectedItems);
    newMap.set(itemId, (newMap.get(itemId) || 0) + 1);
    setSelectedItems(newMap);
  }

  async function addItemsToOrder() {
    if (selectedItems.size === 0) return;

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken || !selectedOrder) return;

    setAddingItems(true);

    try {
      const itemsToAdd = Array.from(selectedItems.entries()).map(([itemId, qty]) => {
        const item = menuItems.find((i) => i.id === itemId);
        if (!item) throw new Error("Item not found");
        return {
          menuItemId: item.id,
          nameSnapshot: item.name,
          priceSnapshot: Number(item.price),
          qty,
          notes: ""
        };
      });

      const res = await fetch(`/api/orders/${selectedOrder.id}/items`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ items: itemsToAdd })
      });

      if (res.ok) {
        // Reload orders
        const load = () =>
          fetch("/api/orders", {
            headers: { authorization: `Bearer ${accessToken}` }
          })
            .then((r) => r.json())
            .then((j) => setOrders(j.data?.orders ?? []));
        await load();
        closeAddItemsModal();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add items");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add items");
    } finally {
      setAddingItems(false);
    }
  }

  const filteredMenuItems = selectedCategoryId
    ? menuItems.filter((i) => i.categoryId === selectedCategoryId)
    : menuItems;

  const filtered = orders.filter((o) => (activeTab === "ALL" ? true : o.type === activeTab));
  const placed = filtered.filter((o) => o.status === "PLACED");
  const preparing = filtered.filter((o) => o.status === "PREPARING");
  const ready = filtered.filter((o) => o.status === "READY");

  return (
    <div className="p-6" onClick={!audioEnabled ? enableAudio : undefined}>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Kitchen Display (KDS)</h1>
          <div className="flex gap-2">
            {!audioEnabled && (
              <button
                onClick={enableAudio}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                🔊 Enable Sound
              </button>
            )}
            <button
              className={`rounded px-3 py-2 text-sm ${activeTab === "ALL" ? "bg-slate-900 text-white" : "border border-slate-300"}`}
              onClick={() => {
                setActiveTab("ALL");
                if (!audioEnabled) enableAudio();
              }}
            >
              All
            </button>
            <button
              className={`rounded px-3 py-2 text-sm ${activeTab === "DINE_IN" ? "bg-slate-900 text-white" : "border border-slate-300"}`}
              onClick={() => setActiveTab("DINE_IN")}
            >
              Dine-in
            </button>
            <button
              className={`rounded px-3 py-2 text-sm ${activeTab === "TAKEAWAY" ? "bg-slate-900 text-white" : "border border-slate-300"}`}
              onClick={() => setActiveTab("TAKEAWAY")}
            >
              Takeaway
            </button>
            <button
              className={`rounded px-3 py-2 text-sm ${activeTab === "DELIVERY" ? "bg-slate-900 text-white" : "border border-slate-300"}`}
              onClick={() => setActiveTab("DELIVERY")}
            >
              Delivery
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Column
            title="Placed"
            orders={placed}
            actions={(o) => (
              <div className="mt-2 flex gap-2">
                <button className="rounded bg-slate-900 px-3 py-1 text-sm text-white" onClick={() => setStatus(o.id, "PREPARING")}>
                  Start
                </button>
                <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setStatus(o.id, "CANCELLED")}>
                  Cancel
                </button>
              </div>
            )}
            onAddItems={openAddItemsModal}
          />
          <Column
            title="Preparing"
            orders={preparing}
            actions={(o) => (
              <div className="mt-2 flex gap-2">
                <button className="rounded bg-slate-900 px-3 py-1 text-sm text-white" onClick={() => setStatus(o.id, "READY")}>
                  Ready
                </button>
                <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setStatus(o.id, "CANCELLED")}>
                  Cancel
                </button>
              </div>
            )}
            onAddItems={openAddItemsModal}
          />
          <Column
            title="Ready"
            orders={ready}
            actions={(o) => (
              <div className="mt-2 flex gap-2">
                <button className="rounded bg-slate-900 px-3 py-1 text-sm text-white" onClick={() => setStatus(o.id, "COMPLETED")}>
                  Complete
                </button>
              </div>
            )}
            onAddItems={openAddItemsModal}
          />
        </div>
      </div>

      {/* Add Items Modal */}
      <AddItemsModal
        show={showAddItemsModal}
        order={selectedOrder}
        menuItems={menuItems}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        selectedItems={selectedItems}
        toggleItem={toggleItem}
        incrementItem={incrementItem}
        onClose={closeAddItemsModal}
        onAdd={addItemsToOrder}
        addingItems={addingItems}
      />
    </div>
  );
}

function Column({
  title,
  orders,
  actions,
  onAddItems
}: {
  title: string;
  orders: any[];
  actions: (o: any) => React.ReactNode;
  onAddItems: (order: any) => void;
}) {
  return (
    <section className="rounded border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-slate-600">{orders.length}</span>
      </div>

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{o.type}</div>
              {o.tableNo ? <div className="text-xs text-slate-600">Table: {o.tableNo}</div> : null}
            </div>

            <div className="mt-2 space-y-1">
              {(o.items ?? []).map((it: any) => (
                <div key={it.id} className="text-sm">
                  <div className="flex justify-between">
                    <span className="truncate pr-2">{it.nameSnapshot}</span>
                    <span className="font-medium">x{it.qty}</span>
                  </div>
                  {it.notes ? <div className="text-xs text-slate-600">{it.notes}</div> : null}
                </div>
              ))}
            </div>

            {actions(o)}
            {/* Add Items button for orders that aren't completed/cancelled */}
            {o.status !== "COMPLETED" && o.status !== "CANCELLED" && (
              <button
                className="mt-2 w-full rounded border border-emerald-500 bg-emerald-50 px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-100"
                onClick={() => onAddItems(o)}
              >
                ➕ Add Items
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function AddItemsModal({
  show,
  order,
  menuItems,
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  selectedItems,
  toggleItem,
  incrementItem,
  onClose,
  onAdd,
  addingItems
}: {
  show: boolean;
  order: any;
  menuItems: MenuItem[];
  categories: Category[];
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  selectedItems: Map<string, number>;
  toggleItem: (id: string) => void;
  incrementItem: (id: string) => void;
  onClose: () => void;
  onAdd: () => void;
  addingItems: boolean;
}) {
  if (!show) return null;

  const filteredMenuItems = selectedCategoryId
    ? menuItems.filter((i) => i.categoryId === selectedCategoryId)
    : menuItems;

  const totalQty = Array.from(selectedItems.values()).reduce((sum, qty) => sum + qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <h2 className="text-xl font-bold">Add Items to Order</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 rounded-lg bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-700">
              Order #{order.id.slice(-6)} • Table: {order.tableNo || "N/A"}
            </div>
            <div className="text-xs text-slate-600">Status: {order.status}</div>
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategoryId("")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  !selectedCategoryId
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    selectedCategoryId === cat.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items */}
          <div className="mb-4 max-h-96 overflow-y-auto rounded-lg border border-slate-200">
            <div className="divide-y divide-slate-200">
              {filteredMenuItems.map((item) => {
                const qty = selectedItems.get(item.id) || 0;
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-50">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="text-sm text-slate-600">₹{Number(item.price).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {qty > 0 && (
                        <>
                          <button
                            onClick={() => toggleItem(item.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-semibold">{qty}</span>
                        </>
                      )}
                      <button
                        onClick={() => incrementItem(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Items Summary */}
          {totalQty > 0 && (
            <div className="mb-4 rounded-lg bg-emerald-50 p-3">
              <div className="text-sm font-semibold text-emerald-900">
                {totalQty} {totalQty === 1 ? "item" : "items"} selected
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={onAdd}
              disabled={totalQty === 0 || addingItems}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingItems ? "Adding..." : `Add ${totalQty} Item${totalQty !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
