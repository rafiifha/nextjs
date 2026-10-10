'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { Plus, Edit, Trash2, Package, Loader2, Search, X, ShoppingBag, Box } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: number;
  name: string;
  priceTypes: string[];
}

interface ProductVariant {
  id: number;
  priceType: string;
  price: number | null;
  stock?: number | null;
  stockOnline?: number | null;
  stockOffline?: number | null;
}

interface Product {
  id: number;
  name: string;
  image?: string | null;
  categoryId: number;
  category: Category;
  variants: ProductVariant[];
  hasTransactions?: boolean;
  transactionCount?: number;
  salesCount?: number;
}

export default function ManajemenProdukPage() {

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    image: '',
    variants: [] as Array<{
      priceType: string;
      price: string;
      stock: string;
    }>,
  });

  // Saat komponen dimuat pertama kali, ambil data kategori dan produk dari server
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // Mengambil daftar kategori produk dari API
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/kategori');
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Mengambil daftar semua produk beserta varian dari API
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

  // Saat kategori dipilih, otomatis membuat varian harga sesuai priceTypes kategori tersebut
  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === parseInt(categoryId));
    if (category) {
      // Membuat varian kosong berdasarkan tipe harga kategori (misal: dus, bal, pcs)
      const newVariants = category.priceTypes.map(priceType => ({
        priceType,
        price: '',
        stock: '',
      }));
      setFormData({ ...formData, categoryId, variants: newVariants });
    }
  };

  // Memperbarui data varian tertentu (harga/stok) berdasarkan index
  const updateVariant = (index: number, field: string, value: string) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  // Mengunggah gambar produk ke server via endpoint /api/upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Error', { description: 'File harus berupa gambar' });
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data,
      });

      if (res.ok) {
        const result = await res.json();
        setFormData((prev) => ({ ...prev, image: result.url }));
        toast.success('Berhasil', { description: 'Gambar berhasil diunggah' });
      } else {
        const err = await res.json();
        toast.error('Error', { description: err.error || 'Gagal mengunggah gambar' });
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      toast.error('Error', { description: 'Gagal mengunggah gambar' });
    } finally {
      setUploading(false);
    }
  };

  // Menyimpan data produk (tambah baru atau update) ke server via API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi: nama, kategori, dan minimal satu varian harus ada
    if (!formData.name || !formData.categoryId || formData.variants.length === 0) {
      toast.error('Error', { description: 'Semua field harus diisi' });
      return;
    }

    // Harga bersifat opsional (bisa null jika belum ditentukan)

    const productData = {
      name: formData.name,
      categoryId: parseInt(formData.categoryId),
      image: formData.image || null,
      variants: formData.variants.map(v => {
        const price = v.price && v.price !== '' ? (isNaN(parseInt(v.price)) ? null : parseInt(v.price)) : null;
        const stockValue = v.stock && v.stock !== '' ? (isNaN(parseInt(v.stock)) ? null : parseInt(v.stock)) : null;

        return {
          priceType: v.priceType,
          price,
          stock: stockValue,
          stockOnline: stockValue,
          stockOffline: stockValue,
        };
      }),
    };

    try {
      if (editingProduct) {
        if (!editingProduct.id) {
          toast.error('Error', { description: 'ID produk tidak ditemukan' });
          return;
        }

        console.log('Updating product with ID:', editingProduct.id);
        const res = await fetch(`/api/produk/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        });

        if (res.ok) {
          toast.success('Berhasil', { description: 'Produk berhasil diupdate' });
          resetForm();
          fetchProducts();
        } else {
          const error = await res.json();
          console.error('Update error response:', error);
          toast.error('Error', { description: error.error || error.details || 'Gagal mengupdate produk' });
        }
      } else {
        const res = await fetch('/api/produk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        });

        if (res.ok) {
          toast.success('Berhasil', { description: 'Produk berhasil ditambahkan' });
          resetForm();
          fetchProducts();
        } else {
          const error = await res.json();
          console.error('Create error response:', error);
          toast.error('Error', { description: error.error || error.details || 'Gagal menambahkan produk' });
        }
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error('Error', { description: error?.message || 'Terjadi kesalahan' });
    }
  };

  // Mengisi form dengan data produk yang akan diedit
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      categoryId: product.categoryId.toString(),
      image: product.image || '',
      variants: product.variants.map(v => {
        const stockVal = v.stock ?? v.stockOffline ?? v.stockOnline;
        return {
          priceType: v.priceType,
          price: v.price ? v.price.toString() : '',
          stock: stockVal !== null && stockVal !== undefined ? stockVal.toString() : '',
        };
      }),
    });
    setShowForm(true);
  };

  // Menghapus produk setelah konfirmasi dari admin
  const handleDelete = (id: number) => {
    toast('Yakin ingin menghapus produk ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            const res = await fetch(`/api/produk/${id}`, {
              method: 'DELETE',
            });

            if (res.ok) {
              toast.success('Berhasil', { description: 'Produk berhasil dihapus' });
              fetchProducts();
            } else {
              const error = await res.json();
              console.error('Delete error response:', error);
              toast.error('Error', { description: error.error || error.details || 'Gagal menghapus produk' });
            }
          } catch (error: any) {
            console.error('Error deleting product:', error);
            toast.error('Error', { description: error?.message || 'Terjadi kesalahan' });
          }
        }
      },
      cancel: {
        label: 'Batal',
        onClick: () => {}
      }
    });
  };

  // Mereset form produk ke kondisi awal
  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      image: '',
      variants: [] as Array<{
        priceType: string;
        price: string;
        stock: string;
      }>,
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  // Mengambil nama kategori berdasarkan ID
  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  // Filter produk berdasarkan kata kunci pencarian dan kategori yang dipilih
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategoryId || product.categoryId === parseInt(selectedCategoryId);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Produk</h1>
          <p className="text-gray-600">Kelola produk dan varian harga</p>
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

              <div>
                <Label>Gambar Produk</Label>
                <div className="mt-2 flex items-center gap-4">
                  {formData.image ? (
                    <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200 group">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 text-gray-400 text-xs">
                      No Image
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Mengunggah...
                        </>
                      ) : (
                        'Pilih File Gambar'
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, JPEG sampai 5MB</p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="categoryId">Kategori</Label>
                <select
                  id="categoryId"
                  value={formData.categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {formData.categoryId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Jenis harga: {categories.find(c => c.id === parseInt(formData.categoryId))?.priceTypes.join(', ')}
                  </p>
                )}
              </div>

              {formData.variants.length > 0 && (
                <div className="space-y-4">
                  <Label>Varian Harga & Stok</Label>
                  {formData.variants.map((variant, index) => (
                    <Card key={index} className="p-4 border-gray-200">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700 capitalize">{variant.priceType}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`price-${index}`}>Harga (Opsional)</Label>
                            <Input
                              id={`price-${index}`}
                              type="number"
                              min="0"
                              value={variant.price}
                              onChange={(e) => updateVariant(index, 'price', e.target.value)}
                              placeholder="Belum ada harga"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`stock-${index}`}>Stok</Label>
                            <Input
                              id={`stock-${index}`}
                              type="number"
                              min="0"
                              value={variant.stock}
                              onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

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

      {/* Search and Filter Section */}
      {!showForm && (
        <Card className="mb-6 border-gray-200 shadow-md">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
          <p className="text-gray-600">Memuat produk...</p>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {

            return (
              <Card key={product.id} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[#ffd700]/10 to-[#ffd700]/5 pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {product.name}
                      </CardTitle>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          <Box className="h-3 w-3" />
                          {getCategoryName(product.categoryId)}
                        </div>
                        {product.hasTransactions && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-semibold">
                            Ada Transaksi ({product.salesCount ?? 0} item)
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-12 w-12 object-cover rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="p-2 bg-[#ffd700]/20 rounded-lg">
                          <Package className="h-5 w-5 text-[#ffd700]" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {/* Variants List */}
                  <div className="space-y-2.5 mb-4 max-h-64 overflow-y-auto pr-1">
                    {product.variants.map((variant) => {
                      const stockVal = variant.stock ?? variant.stockOffline ?? variant.stockOnline;
                      const hasStock = (stockVal ?? 0) > 0;

                      return (
                        <div key={variant.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:border-[#ffd700]/50 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800 capitalize text-sm">
                                {variant.priceType}
                              </span>
                              {variant.price && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                                  Ada Harga
                                </span>
                              )}
                            </div>
                            {variant.price ? (
                              <span className="font-bold text-[#ffd700] text-sm">
                                {formatRupiah(variant.price)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Belum ada harga</span>
                            )}
                          </div>
                          <div className="flex gap-2 text-xs">
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${hasStock ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'}`}>
                              <Package className={`h-3.5 w-3.5 ${hasStock ? 'text-blue-600' : 'text-red-500'}`} />
                              <span className="font-medium">
                                Stok: {stockVal !== null && stockVal !== undefined ? stockVal : '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      className="flex-1 hover:bg-[#ffd700]/10 hover:border-[#ffd700] transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-1.5" />
                      Edit
                    </Button>
                    {!product.hasTransactions && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="flex-1 hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Hapus
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-gray-200">
          <CardContent className="pt-16 pb-16 text-center">
            <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
            {searchQuery || selectedCategoryId ? (
              <>
                <p className="text-gray-700 font-semibold mb-1.5">Produk tidak ditemukan</p>
                <p className="text-sm text-gray-600 mb-4">
                  Tidak ada produk yang sesuai dengan pencarian atau filter yang dipilih
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategoryId('');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Hapus Filter
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-700 font-semibold mb-1.5">Belum ada produk</p>
                <p className="text-sm text-gray-600">Klik tombol "Tambah Produk" untuk menambahkan produk pertama</p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
