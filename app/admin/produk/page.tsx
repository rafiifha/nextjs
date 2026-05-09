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
  stock: number | null;
}

interface Product {
  id: number;
  name: string;
  categoryId: number;
  category: Category;
  variants: ProductVariant[];
}

export default function ManajemenProdukPage() {

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    variants: [] as Array<{
      priceType: string;
      price: string;
      stock: string;
    }>,
  });

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

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

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === parseInt(categoryId));
    if (category) {
      // Initialize variants based on category price types
      const newVariants = category.priceTypes.map(priceType => ({
        priceType,
        price: '',
        stock: '',
      }));
      setFormData({ ...formData, categoryId, variants: newVariants });
    }
  };

  const updateVariant = (index: number, field: string, value: string) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.categoryId || formData.variants.length === 0) {
      toast.error('❌ Error', { description: 'Semua field harus diisi' });
      return;
    }

    // Price is optional, no validation needed

    const productData = {
      name: formData.name,
      categoryId: parseInt(formData.categoryId),
      variants: formData.variants.map(v => {
        const price = v.price && v.price !== '' ? (isNaN(parseInt(v.price)) ? null : parseInt(v.price)) : null;
        const stockValue = v.stock && v.stock !== '' ? (isNaN(parseInt(v.stock)) ? null : parseInt(v.stock)) : null;

        return {
          priceType: v.priceType,
          price,
          stock: stockValue,
        };
      }),
    };

    try {
      if (editingProduct) {
        if (!editingProduct.id) {
          toast.error('❌ Error', { description: 'ID produk tidak ditemukan' });
          return;
        }

        console.log('Updating product with ID:', editingProduct.id);
        const res = await fetch(`/api/produk/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        });

        if (res.ok) {
          toast.success('✅ Berhasil', { description: 'Produk berhasil diupdate' });
          resetForm();
          fetchProducts();
        } else {
          const error = await res.json();
          console.error('Update error response:', error);
          toast.error('❌ Error', { description: error.error || error.details || 'Gagal mengupdate produk' });
        }
      } else {
        const res = await fetch('/api/produk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        });

        if (res.ok) {
          toast.success('✅ Berhasil', { description: 'Produk berhasil ditambahkan' });
          resetForm();
          fetchProducts();
        } else {
          const error = await res.json();
          console.error('Create error response:', error);
          toast.error('❌ Error', { description: error.error || error.details || 'Gagal menambahkan produk' });
        }
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error('❌ Error', { description: error?.message || 'Terjadi kesalahan' });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      categoryId: product.categoryId.toString(),
      variants: product.variants.map(v => ({
        priceType: v.priceType,
        price: v.price ? v.price.toString() : '',
        stock: v.stock !== null && v.stock !== undefined ? v.stock.toString() : '',
      })),
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
        toast.success('✅ Berhasil', { description: 'Produk berhasil dihapus' });
        fetchProducts();
      } else {
        const error = await res.json();
        console.error('Delete error response:', error);
        toast.error('❌ Error', { description: error.error || error.details || 'Gagal menghapus produk' });
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('❌ Error', { description: error?.message || 'Terjadi kesalahan' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      variants: [],
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  // Filter products based on search query and category
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
          <p className="text-gray-600">Kelola produk, kategori, dan varian harga</p>
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
                              placeholder="Kosongkan jika belum ada harga"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`stock-${index}`}>Stok (Opsional)</Label>
                            <Input
                              id={`stock-${index}`}
                              type="number"
                              min="0"
                              value={variant.stock}
                              onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                              placeholder="Kosongkan jika belum ada stok"
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
            const totalVariants = product.variants.length;
            const totalStock = product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);

            return (
              <Card key={product.id} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[#ffd700]/10 to-[#ffd700]/5 pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {product.name}
                      </CardTitle>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <Box className="h-3 w-3" />
                        {getCategoryName(product.categoryId)}
                      </div>
                    </div>
                    <div className="ml-2 p-2 bg-[#ffd700]/20 rounded-lg">
                      <Package className="h-5 w-5 text-[#ffd700]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Varian</p>
                      <p className="text-sm font-bold text-gray-900">{totalVariants}</p>
                    </div>
                    <div className="text-center border-l border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Total Stok</p>
                      <p className={`text-sm font-bold ${totalStock > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {totalStock}
                      </p>
                    </div>
                  </div>

                  {/* Variants List */}
                  <div className="space-y-2.5 mb-4 max-h-64 overflow-y-auto pr-1">
                    {product.variants.map((variant) => {
                      const hasStock = (variant.stock ?? 0) > 0;

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
                            <div className={`flex items-center gap-1 px-2 py-1 rounded ${hasStock ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'}`}>
                              <Package className={`h-3 w-3 ${hasStock ? 'text-blue-600' : 'text-red-500'}`} />
                              <span className="font-medium">
                                Stok: {variant.stock !== null && variant.stock !== undefined ? variant.stock : '-'}
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
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      className="flex-1 hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Hapus
                    </Button>
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
