"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
};

type Subcategory = {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
};

type MenuItem = {
  id: string;
  categoryId: string;
  subcategoryId?: string | null;
  name: string;
  description?: string | null;
  price: number | string;
  isVeg: boolean;
  isEnabled: boolean;
  modifiers?: any;
};

export default function MenuPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");

  // Category form
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySort, setNewCategorySort] = useState<number>(0);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Subcategory form
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategorySort, setNewSubcategorySort] = useState<number>(0);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);

  // Item form
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemPrice, setNewItemPrice] = useState<number>(0);
  const [newItemIsVeg, setNewItemIsVeg] = useState(false);
  const [newItemSubcategoryId, setNewItemSubcategoryId] = useState<string>("");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const toast = useToast();

  useEffect(() => {
    refreshAll();
  }, []);

  async function refreshAll() {
    setLoading(true);
    try {
      const [catsRes, itemsRes] = await Promise.all([
        apiFetch<{ categories: Category[] }>("/api/menu/categories"),
        apiFetch<{ items: MenuItem[] }>("/api/menu/items")
      ]);

      if (catsRes.ok) setCategories(catsRes.data.categories);
      if (itemsRes.ok) setItems(itemsRes.data.items);

      // Refresh subcategories if category is selected
      if (selectedCategoryId) {
        await refreshSubcategories();
      }
    } catch (e) {
      toast.push({ variant: "error", message: "Failed to load menu" });
    } finally {
      setLoading(false);
    }
  }

  async function refreshSubcategories() {
    if (!selectedCategoryId) {
      setSubcategories([]);
      return;
    }
    try {
      const res = await apiFetch<{ subcategories: Subcategory[] }>(
        `/api/menu/subcategories?categoryId=${encodeURIComponent(selectedCategoryId)}`
      );
      if (res.ok) {
        setSubcategories(res.data.subcategories);
      }
    } catch (e) {
      console.error("Failed to load subcategories", e);
    }
  }

  // Category operations
  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      toast.push({ variant: "error", message: "Category name is required" });
      return;
    }

    const res = await apiFetch("/api/menu/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, sortOrder: newCategorySort })
    });

    if (!res.ok) {
      toast.push({ variant: "error", message: res.error?.message || "Failed to create category" });
      return;
    }

    setNewCategoryName("");
    setNewCategorySort(0);
    await refreshAll();
    toast.push({ variant: "success", message: "Category created successfully" });
  }

  async function updateCategory(category: Category) {
    const res = await apiFetch(`/api/menu/categories/${category.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: category.name, sortOrder: category.sortOrder, isEnabled: category.isEnabled })
    });

    if (!res.ok) {
      toast.push({ variant: "error", message: res.error?.message || "Failed to update category" });
      return;
    }

    setEditingCategory(null);
    await refreshAll();
    toast.push({ variant: "success", message: "Category updated" });
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category? Items and subcategories in this category will not be deleted.")) return;

    const res = await apiFetch(`/api/menu/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.push({ variant: "error", message: res.error?.message || "Failed to delete category" });
      return;
    }

    if (selectedCategoryId === id) {
      setSelectedCategoryId("");
      setSelectedSubcategoryId("");
    }
    await refreshAll();
    toast.push({ variant: "success", message: "Category deleted" });
  }

  // Subcategory operations
  async function createSubcategory() {
    if (!selectedCategoryId) {
      toast.push({ variant: "error", message: "Please select a category first" });
      return;
    }

    const name = newSubcategoryName.trim();
    if (!name) {
      toast.push({ variant: "error", message: "Subcategory name is required" });
      return;
    }

    const res = await apiFetch("/api/menu/subcategories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: selectedCategoryId,
        name,
        sortOrder: newSubcategorySort
      })
    });

    if (!res.ok) {
      toast.push({ variant: "error", message: res.error?.message || "Failed to create subcategory" });
      return;
    }

    setNewSubcategoryName("");
    setNewSubcategorySort(0);
    await refreshSubcategories();
    toast.push({ variant: "success", message: "Subcategory created successfully" });
  }

  async function updateSubcategory(subcategory: Subcategory) {
    const res = await apiFetch(`/api/menu/subcategories/${subcategory.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: subcategory.name,
        sortOrder: subcategory.sortOrder,
        isEnabled: subcategory.isEnabled
      })
    });

    if (!res.ok) {
      toast.push({ variant: "error", message: res.error?.message || "Failed to update subcategory" });
      return;
    }

    setEditingSubcategory(null);
    await refreshSubcategories();
    toast.push({ variant: "success", message: "Subcategory updated" });
  }

  async function deleteSubcategory(id: string) {
    if (!confirm("Delete this subcategory? Items in this subcategory will not be deleted.")) return;

    const res = await apiFetch(`/api/menu/subcategories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.push({ variant: "error", message: res.error?.message || "Failed to delete subcategory" });
      return;
    }

    if (selectedSubcategoryId === id) setSelectedSubcategoryId("");
    await refreshSubcategories();
    toast.push({ variant: "success", message: "Subcategory deleted" });
  }

  async function toggleSubcategory(id: string, isEnabled: boolean) {
    const subcategory = subcategories.find((s) => s.id === id);
    if (!subcategory) return;

    const res = await apiFetch(`/api/menu/subcategories/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...subcategory, isEnabled })
    });

    if (!res.ok) {
      toast.push({ variant: "error", message: res.error?.message || "Failed to update subcategory" });
    } else {
      await refreshSubcategories();
      toast.push({ variant: "success", message: `Subcategory ${isEnabled ? "enabled" : "disabled"}` });
    }
  }

  async function toggleCategory(id: string, isEnabled: boolean) {
    const category = categories.find((c) => c.id === id);
    if (!category) return;

    const res = await apiFetch(`/api/menu/categories/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...category, isEnabled })
    });

    if (!res.ok) {
      toast.push({ variant: "error", message: res.error?.message || "Failed to update category" });
    } else {
      await refreshAll();
      toast.push({ variant: "success", message: `Category ${isEnabled ? "enabled" : "disabled"}` });
    }
  }

  // Item operations
  async function createItem() {
    if (!selectedCategoryId) {
      toast.push({ variant: "error", message: "Please select a category first" });
      return;
    }

    const name = newItemName.trim();
    if (!name) {
      toast.push({ variant: "error", message: "Item name is required" });
      return;
    }

    if (newItemPrice <= 0) {
      toast.push({ variant: "error", message: "Price must be greater than 0" });
      return;
    }

    const res = await apiFetch("/api/menu/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: selectedCategoryId,
        subcategoryId: newItemSubcategoryId || undefined,
        name,
        description: newItemDescription.trim() || undefined,
        price: newItemPrice,
        isVeg: newItemIsVeg,
        isEnabled: true,
        modifiers: []
      })
    });

    if (!res.ok) {
      toast.push({ variant: "error", message: res.error?.message || "Failed to create item" });
      return;
    }

    setNewItemName("");
    setNewItemDescription("");
    setNewItemPrice(0);
    setNewItemIsVeg(false);
    setNewItemSubcategoryId("");
    await refreshAll();
    toast.push({ variant: "success", message: "Item created successfully" });
  }

  async function updateItem(item: MenuItem) {
    const res = await apiFetch(`/api/menu/items/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: item.name,
        description: item.description || undefined,
        price: Number(item.price),
        isVeg: item.isVeg,
        isEnabled: item.isEnabled,
        subcategoryId: item.subcategoryId || null
      })
    });

    if (!res.ok) {
      toast.push({ variant: "error", message: res.error?.message || "Failed to update item" });
      return;
    }

    setEditingItem(null);
    await refreshAll();
    toast.push({ variant: "success", message: "Item updated" });
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this menu item?")) return;

    const res = await apiFetch(`/api/menu/items/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.push({ variant: "error", message: res.error?.message || "Failed to delete item" });
      return;
    }

    await refreshAll();
    toast.push({ variant: "success", message: "Item deleted" });
  }

  async function toggleItem(id: string, isEnabled: boolean) {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const res = await apiFetch(`/api/menu/items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...item, isEnabled })
    });

    if (!res.ok) {
      toast.push({ variant: "error", message: res.error?.message || "Failed to update item" });
    } else {
      await refreshAll();
      toast.push({ variant: "success", message: `Item ${isEnabled ? "enabled" : "disabled"}` });
    }
  }

  const filteredItems = useMemo(() => {
    let filtered = items;

    if (selectedCategoryId) {
      filtered = filtered.filter((i) => i.categoryId === selectedCategoryId);
    }

    if (selectedSubcategoryId) {
      filtered = filtered.filter((i) => i.subcategoryId === selectedSubcategoryId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(query) || i.description?.toLowerCase().includes(query));
    }

    return filtered;
  }, [items, selectedCategoryId, selectedSubcategoryId, searchQuery]);

  useEffect(() => {
    if (selectedCategoryId) {
      refreshSubcategories();
      setSelectedSubcategoryId("");
    } else {
      setSubcategories([]);
      setSelectedSubcategoryId("");
    }
  }, [selectedCategoryId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Menu Management</h1>
            <p className="mt-1 text-sm text-slate-600">Manage categories and menu items</p>
          </div>
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            onClick={refreshAll}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Search */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="🔍 Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Categories Section */}
          <section className="lg:col-span-1">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Categories</h2>

              {/* Create Category Form */}
              {!editingCategory ? (
                <div className="mb-6 space-y-3">
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="Category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createCategory()}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      placeholder="Sort"
                      value={newCategorySort}
                      onChange={(e) => setNewCategorySort(Number(e.target.value) || 0)}
                    />
                    <button
                      className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                      onClick={createCategory}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={editingCategory.sortOrder}
                      onChange={(e) => setEditingCategory({ ...editingCategory, sortOrder: Number(e.target.value) || 0 })}
                    />
                    <button
                      className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                      onClick={() => updateCategory(editingCategory)}
                    >
                      Save
                    </button>
                    <button
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => setEditingCategory(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Categories List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">No categories yet</p>
                ) : (
                  categories.map((c) => (
                    <div key={c.id}>
                      <div
                        className={`group rounded-lg border-2 p-3 transition-colors ${
                          selectedCategoryId === c.id
                            ? "border-slate-900 bg-slate-50"
                            : c.isEnabled
                              ? "border-slate-200 hover:border-slate-300"
                              : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            className="flex-1 text-left"
                            onClick={() => {
                              setSelectedCategoryId(c.id === selectedCategoryId ? "" : c.id);
                              setSearchQuery("");
                            }}
                          >
                            <div className="font-medium text-slate-900">{c.name}</div>
                            <div className="text-xs text-slate-600">
                              {items.filter((i) => i.categoryId === c.id).length} items • Sort: {c.sortOrder}
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              className="rounded px-2 py-1 text-xs hover:bg-slate-200"
                              onClick={() => setEditingCategory(c)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="rounded px-2 py-1 text-xs hover:bg-slate-200"
                              onClick={() => toggleCategory(c.id, !c.isEnabled)}
                              title={c.isEnabled ? "Disable" : "Enable"}
                            >
                              {c.isEnabled ? "👁️" : "🚫"}
                            </button>
                            <button
                              className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                              onClick={() => deleteCategory(c.id)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Subcategories for selected category */}
                      {selectedCategoryId === c.id && (
                        <div className="mt-2 ml-4 space-y-2 border-l-2 border-slate-300 pl-3">
                          <div className="text-xs font-semibold text-slate-600 mb-2">Subcategories</div>
                          
                          {/* Create Subcategory Form */}
                          {!editingSubcategory ? (
                            <div className="mb-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                              <input
                                type="text"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                                placeholder="Subcategory name"
                                value={newSubcategoryName}
                                onChange={(e) => setNewSubcategoryName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && createSubcategory()}
                              />
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                                  placeholder="Sort"
                                  value={newSubcategorySort}
                                  onChange={(e) => setNewSubcategorySort(Number(e.target.value) || 0)}
                                />
                                <button
                                  className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
                                  onClick={createSubcategory}
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                              <input
                                type="text"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                value={editingSubcategory.name}
                                onChange={(e) => setEditingSubcategory({ ...editingSubcategory, name: e.target.value })}
                              />
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                  value={editingSubcategory.sortOrder}
                                  onChange={(e) => setEditingSubcategory({ ...editingSubcategory, sortOrder: Number(e.target.value) || 0 })}
                                />
                                <button
                                  className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
                                  onClick={() => updateSubcategory(editingSubcategory)}
                                >
                                  Save
                                </button>
                                <button
                                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs hover:bg-slate-50"
                                  onClick={() => setEditingSubcategory(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Subcategories List */}
                          {subcategories.length === 0 ? (
                            <p className="py-2 text-center text-xs text-slate-500">No subcategories</p>
                          ) : (
                            subcategories.map((s) => (
                              <div
                                key={s.id}
                                className={`group rounded-lg border p-2 transition-colors ${
                                  selectedSubcategoryId === s.id
                                    ? "border-slate-700 bg-slate-100"
                                    : s.isEnabled
                                      ? "border-slate-200 hover:border-slate-300 bg-white"
                                      : "border-red-200 bg-red-50"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <button
                                    className="flex-1 text-left"
                                    onClick={() => {
                                      setSelectedSubcategoryId(s.id === selectedSubcategoryId ? "" : s.id);
                                      setSearchQuery("");
                                    }}
                                  >
                                    <div className="text-xs font-medium text-slate-900">{s.name}</div>
                                    <div className="text-xs text-slate-500">
                                      {items.filter((i) => i.subcategoryId === s.id).length} items
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <button
                                      className="rounded px-1.5 py-0.5 text-xs hover:bg-slate-200"
                                      onClick={() => setEditingSubcategory(s)}
                                      title="Edit"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      className="rounded px-1.5 py-0.5 text-xs hover:bg-slate-200"
                                      onClick={() => toggleSubcategory(s.id, !s.isEnabled)}
                                      title={s.isEnabled ? "Disable" : "Enable"}
                                    >
                                      {s.isEnabled ? "👁️" : "🚫"}
                                    </button>
                                    <button
                                      className="rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-100"
                                      onClick={() => deleteSubcategory(s.id)}
                                      title="Delete"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Items Section */}
          <section className="lg:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Menu Items
                  {selectedCategoryId && (
                    <span className="ml-2 text-sm font-normal text-slate-600">
                      ({categories.find((c) => c.id === selectedCategoryId)?.name})
                    </span>
                  )}
                </h2>
                <div className="text-sm text-slate-600">
                  {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
                </div>
              </div>

              {/* Create Item Form */}
              {!selectedCategoryId ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                  <p className="text-sm text-amber-800">Select a category to add items</p>
                </div>
              ) : !editingItem ? (
                <div className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="Item name *"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                  <textarea
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="Description (optional)"
                    rows={2}
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        value={newItemPrice || ""}
                        onChange={(e) => setNewItemPrice(Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={newItemIsVeg}
                          onChange={(e) => setNewItemIsVeg(e.target.checked)}
                        />
                        <span>Vegetarian</span>
                      </label>
                    </div>
                  </div>
                  <button
                    className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    onClick={createItem}
                  >
                    ➕ Add Item
                  </button>
                </div>
              ) : (
                <div className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  />
                  <textarea
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="Description"
                    rows={2}
                    value={editingItem.description || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={Number(editingItem.price) || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={editingItem.isVeg}
                          onChange={(e) => setEditingItem({ ...editingItem, isVeg: e.target.checked })}
                        />
                        <span>Vegetarian</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                      onClick={() => updateItem(editingItem)}
                    >
                      Save
                    </button>
                    <button
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                      onClick={() => setEditingItem(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-slate-600">
                      {searchQuery ? "No items found matching your search" : "No items in this category"}
                    </p>
                  </div>
                ) : (
                  filteredItems.map((it) => (
                    <div
                      key={it.id}
                      className={`group rounded-lg border-2 p-4 transition-colors ${
                        it.isEnabled ? "border-slate-200 hover:border-slate-300" : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${it.isVeg ? "text-green-600" : "text-red-600"}`}>
                              {it.isVeg ? "🟢" : "🔴"}
                            </span>
                            <h3 className="font-semibold text-slate-900">{it.name}</h3>
                            {!it.isEnabled && (
                              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                Disabled
                              </span>
                            )}
                          </div>
                          {it.description && (
                            <p className="mt-1 text-sm text-slate-600 line-clamp-2">{it.description}</p>
                          )}
                          <div className="mt-2 text-sm font-bold text-slate-900">₹ {Number(it.price).toFixed(2)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="rounded px-2 py-1 text-xs hover:bg-slate-200"
                            onClick={() => setEditingItem(it)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="rounded px-2 py-1 text-xs hover:bg-slate-200"
                            onClick={() => toggleItem(it.id, !it.isEnabled)}
                            title={it.isEnabled ? "Disable" : "Enable"}
                          >
                            {it.isEnabled ? "👁️" : "🚫"}
                          </button>
                          <button
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                            onClick={() => deleteItem(it.id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
