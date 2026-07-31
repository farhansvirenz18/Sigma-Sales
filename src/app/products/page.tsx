"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface ProductPrice {
  id: number;
  product_code: string;
  platform: string;
  hpp: number;
  effective_date: string;
  created_at: string;
}

interface Product {
  code: string;
  name: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  prices: { platform: string; hpp: number }[];
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

function isAutoCreated(createdAt: string, name: string, code: string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 3600000 || name === code;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ code: "", name: "", category: "Regular" });
  const [adding, setAdding] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ name: "", category: "Regular", is_active: true });
  const [editing, setEditing] = useState(false);

  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [priceForm, setPriceForm] = useState({ platform: "WEB", hpp: "" });
  const [addingPrice, setAddingPrice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });
        if (search) params.set("search", search);

        const res = await fetch(`/api/products?${params}`);
        const data = await res.json();
        if (!cancelled) {
          setProducts(data.products || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch {
        if (!cancelled) toast.error("Gagal memuat produk");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, search, refreshKey]);

  const handleAdd = async () => {
    if (!addForm.code.trim() || !addForm.name.trim()) {
      toast.error("Code dan Name wajib diisi");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah produk");
      toast.success("Produk berhasil ditambahkan");
      setShowAddModal(false);
      setAddForm({ code: "", name: "", category: "Regular" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah produk");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async () => {
    if (!editingProduct) return;
    setEditing(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengupdate produk");
      toast.success("Produk berhasil diupdate");
      setEditingProduct(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengupdate produk");
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deletingProduct.code}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus produk");
      toast.success("Produk berhasil dihapus");
      setDeletingProduct(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus produk");
    } finally {
      setDeleting(false);
    }
  };

  const loadPrices = async (product: Product) => {
    setSelectedProduct(product);
    setLoadingPrices(true);
    setShowPriceForm(false);
    setPriceForm({ platform: "WEB", hpp: "" });
    try {
      const res = await fetch(`/api/products/${product.code}/prices`);
      const data = await res.json();
      setPrices(data.prices || []);
    } catch {
      toast.error("Gagal memuat harga");
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleAddPrice = async () => {
    if (!selectedProduct || !priceForm.hpp) return;
    const hppNum = parseFloat(priceForm.hpp);
    if (isNaN(hppNum) || hppNum < 0) {
      toast.error("HPP harus berupa angka positif");
      return;
    }
    setAddingPrice(true);
    try {
      const res = await fetch(`/api/products/${selectedProduct.code}/prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: priceForm.platform, hpp: hppNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah harga");
      toast.success("HPP berhasil ditambahkan");
      setShowPriceForm(false);
      setPriceForm({ platform: "WEB", hpp: "" });
      loadPrices(selectedProduct);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah harga");
    } finally {
      setAddingPrice(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Product Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Kelola data produk dan harga pokok (HPP)
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Produk
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
              {total} produk
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 sm:p-8 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 sm:h-14 rounded-xl shimmer" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="w-14 sm:w-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 sm:w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Tidak ada produk ditemukan</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Code</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">HPP</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const autoCreated = isAutoCreated(product.created_at, product.name, product.code);
                      const webPrice = product.prices.find((p) => p.platform === "WEB");
                      return (
                        <tr
                          key={product.code}
                          className="border-b border-gray-100 table-row-hover"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium text-gray-900">
                                {product.code}
                              </span>
                              {autoCreated && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700" title="Auto-created dari upload">
                                  Auto
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{product.name}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {product.category || "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              product.is_active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {product.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {webPrice ? formatRupiah(webPrice.hpp) : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => loadPrices(product)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Kelola HPP"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setEditForm({
                                    name: product.name,
                                    category: product.category || "Regular",
                                    is_active: product.is_active,
                                  });
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeletingProduct(product)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Hapus"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-100">
                {products.map((product) => {
                  const autoCreated = isAutoCreated(product.created_at, product.name, product.code);
                  const webPrice = product.prices.find((p) => p.platform === "WEB");
                  return (
                    <div key={product.code} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-gray-900">
                            {product.code}
                          </span>
                          {autoCreated && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                              Auto
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {product.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{product.name}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {product.category || "-"}
                          </span>
                          {webPrice && (
                            <span className="text-xs text-gray-500">
                              HPP: {formatRupiah(webPrice.hpp)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => loadPrices(product)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setEditForm({
                                name: product.name,
                                category: product.category || "Regular",
                                is_active: product.is_active,
                              });
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeletingProduct(product)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs sm:text-sm text-gray-500">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Sebelumnya
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Selanjutnya →
            </Button>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tambah Produk Baru</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode Produk *</label>
                  <input
                    type="text"
                    value={addForm.code}
                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                    placeholder="Contoh: PR02"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="Contoh: PRODUK DUA"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Bundle">Bundle</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex space-x-3 px-6 pb-6">
              <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={adding} className="flex-1">
                Batal
              </Button>
              <Button onClick={handleAdd} loading={adding} className="flex-1">
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingProduct(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Edit Produk</h3>
              <p className="text-sm text-gray-500 mb-4 font-mono">{editingProduct.code}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Bundle">Bundle</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
                </div>
              </div>
            </div>
            <div className="flex space-x-3 px-6 pb-6">
              <Button variant="secondary" onClick={() => setEditingProduct(null)} disabled={editing} className="flex-1">
                Batal
              </Button>
              <Button onClick={handleEdit} loading={editing} className="flex-1">
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in max-h-[80vh] flex flex-col">
            <div className="p-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">HPP Produk</h3>
                  <p className="text-sm text-gray-500 font-mono mt-1">{selectedProduct.code} — {selectedProduct.name}</p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingPrices ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-xl shimmer" />
                  ))}
                </div>
              ) : prices.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Belum ada data HPP</p>
              ) : (
                <div className="space-y-2">
                  {prices.map((price) => (
                    <div key={price.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {price.platform}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{formatRupiah(price.hpp)}</span>
                    </div>
                  ))}
                </div>
              )}

              {showPriceForm && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                    <select
                      value={priceForm.platform}
                      onChange={(e) => setPriceForm({ ...priceForm, platform: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="WEB">WEB</option>
                      <option value="SHOPEE">SHOPEE</option>
                      <option value="TIKTOK SHOP">TIKTOK SHOP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HPP (Rp)</label>
                    <input
                      type="number"
                      value={priceForm.hpp}
                      onChange={(e) => setPriceForm({ ...priceForm, hpp: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowPriceForm(false)} disabled={addingPrice} className="flex-1">
                      Batal
                    </Button>
                    <Button size="sm" onClick={handleAddPrice} loading={addingPrice} className="flex-1">
                      Simpan HPP
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {!showPriceForm && (
              <div className="p-4 border-t border-gray-100">
                <Button onClick={() => { setShowPriceForm(true); setPriceForm({ platform: "WEB", hpp: "" }); }} className="w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah HPP
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deletingProduct}
        title={`Hapus Produk "${deletingProduct?.code}"?`}
        message="Semua data HPP terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeletingProduct(null)}
        loading={deleting}
      />
    </div>
  );
}
