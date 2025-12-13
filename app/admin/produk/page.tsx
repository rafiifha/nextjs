'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { Plus, Edit, Trash2, Package, Loader2 } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  hargaDus: number;
  hargaPak: number;
  hargaRenceng: number;
  stock_online: number;
  stock_offline: number;
}

export default function ManajemenProdukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    hargaDus: '',
    hargaPak: '',
    hargaRenceng: '',
    stock_online: '',
    stock_offline: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/produk');
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name,
      hargaDus: parseInt(formData.hargaDus),
      hargaPak: parseInt(formData.hargaPak),
      hargaRenceng: parseInt(formData.hargaRenceng),
      stock_online: parseInt(formData.stock_online) || 0,
      stock_offline: parseInt(formData.stock_offline) || 0,
    };

    try {
      if (editingProduct) {
        // Update
        const res = await fetch(`/api/produk/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        });

        if (res.ok) {
          alert('Produk berhasil diupdate');
          resetForm();
          fetchProducts();
        } else {
          alert('Gagal mengupdate produk');
        }
      } else {
        // Create
        const res = await fetch('/api/produk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        });

        if (res.ok) {
          alert('Produk berhasil ditambahkan');
          resetForm();
          fetchProducts();
        } else {
          alert('Gagal menambahkan produk');
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      hargaDus: product.hargaDus.toString(),
      hargaPak: product.hargaPak.toString(),
      hargaRenceng: product.hargaRenceng.toString(),
      stock_online: product.stock_online.toString(),
      stock_offline: product.stock_offline.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus produk ini?')) return;

    try {
      const res = await fetch(`/api/produk/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Produk berhasil dihapus');
        fetchProducts();
      } else {
        alert('Gagal menghapus produk');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Terjadi kesalahan');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      hargaDus: '',
      hargaPak: '',
      hargaRenceng: '',
      stock_online: '',
      stock_offline: '',
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Produk</h1>
          <p className="text-gray-600">Kelola produk dan stok</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Produk
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle>{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Produk</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hargaDus">Harga Dus</Label>
                  <Input
                    id="hargaDus"
                    type="number"
                    value={formData.hargaDus}
                    onChange={(e) => setFormData({ ...formData, hargaDus: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hargaPak">Harga Pak</Label>
                  <Input
                    id="hargaPak"
                    type="number"
                    value={formData.hargaPak}
                    onChange={(e) => setFormData({ ...formData, hargaPak: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hargaRenceng">Harga Renceng</Label>
                  <Input
                    id="hargaRenceng"
                    type="number"
                    value={formData.hargaRenceng}
                    onChange={(e) => setFormData({ ...formData, hargaRenceng: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stock_online">Stok Online</Label>
                      <Input
                        id="stock_online"
                        type="number"
                        min="0"
                        value={formData.stock_online}
                        onChange={(e) => setFormData({ ...formData, stock_online: e.target.value })}
                        required
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Untuk transaksi online</p>
                    </div>
                    <div>
                      <Label htmlFor="stock_offline">Stok Offline</Label>
                      <Input
                        id="stock_offline"
                        type="number"
                        min="0"
                        value={formData.stock_offline}
                        onChange={(e) => setFormData({ ...formData, stock_offline: e.target.value })}
                        required
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Untuk transaksi kasir</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                    <p className="text-sm text-blue-900">
                      <strong>Total Stok:</strong>{' '}
                      {(parseInt(formData.stock_online) || 0) + (parseInt(formData.stock_offline) || 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingProduct ? 'Update' : 'Tambah'}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
          <p className="text-gray-600">Memuat produk...</p>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="border-gray-200 shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold">{product.name}</CardTitle>
                    <div className="mt-1 text-sm text-gray-600">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span>
                          Stok Online: <span className={product.stock_online > 0 ? 'text-blue-600 font-semibold' : 'text-red-600'}>{product.stock_online}</span>
                        </span>
                        <span>
                          Stok Offline: <span className={product.stock_offline > 0 ? 'text-gray-600 font-semibold' : 'text-red-600'}>{product.stock_offline}</span>
                        </span>
                        <span className="text-gray-500">
                          Total: <span className="font-semibold">{product.stock_online + product.stock_offline}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <Package className="h-6 w-6 text-[#ffd700]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Dus:</span>
                    <span className="font-medium">{formatRupiah(product.hargaDus)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pak:</span>
                    <span className="font-medium">{formatRupiah(product.hargaPak)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Renceng:</span>
                    <span className="font-medium">{formatRupiah(product.hargaRenceng)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-gray-200">
          <CardContent className="pt-16 pb-16 text-center">
            <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-gray-700 font-semibold mb-1.5">Belum ada produk</p>
            <p className="text-sm text-gray-600">Klik tombol "Tambah Produk" untuk menambahkan produk pertama</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

