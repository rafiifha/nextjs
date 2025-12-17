'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Check,
  X,
  Trash2,
  Phone,
  User,
  Plus,
  Save
} from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ProductRequest {
  id: number;
  productName: string;
  categoryId: number | null;
  category: {
    id: number;
    name: string;
  } | null;
  customerName: string;
  customerPhone: string;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
  priceTypes: string[];
}

export default function ManajemenPermintaanBarangPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productFormData, setProductFormData] = useState({
    categoryId: '',
    variants: [] as Array<{
      priceType: string;
      price: string;
      stock_online: string;
      stock_offline: string;
      length: string;
      width: string;
      height: string;
      weight: string;
    }>,
  });

  useEffect(() => {
    fetchRequests();
    fetchCategories();
  }, []);

  // Auto-generate variants when category is selected in modal
  useEffect(() => {
    if (showCreateProductModal && productFormData.categoryId && categories.length > 0) {
      const category = categories.find(c => c.id === parseInt(productFormData.categoryId));
      if (category && category.priceTypes && category.priceTypes.length > 0 && productFormData.variants.length === 0) {
        const newVariants = category.priceTypes.map(priceType => ({
          priceType,
          price: '',
          stock_online: '',
          stock_offline: '',
          length: '',
          width: '',
          height: '',
          weight: '',
        }));
        setProductFormData(prev => ({ ...prev, variants: newVariants }));
      }
    }
  }, [productFormData.categoryId, categories, showCreateProductModal]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/kategori');
      if (res.ok) {
        const data = await res.json();
        const categoriesData = Array.isArray(data) ? data : [];
        setCategories(categoriesData);
        console.log('Categories loaded:', categoriesData);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/permintaan-barang');
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        variant: "error",
        title: "❌ Gagal Memuat Data",
        description: "Terjadi kesalahan saat memuat daftar permintaan",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    setUpdatingStatus(id);
    try {
      const res = await fetch(`/api/permintaan-barang/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast({
          variant: "success",
          title: "✅ Status Diperbarui",
          description: `Status permintaan berhasil diubah menjadi ${getStatusLabel(newStatus)}`,
        });
        fetchRequests();
      } else {
        const data = await res.json();
        toast({
          variant: "error",
          title: "❌ Gagal Mengupdate Status",
          description: data.error || "Terjadi kesalahan saat mengupdate status",
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: "error",
        title: "❌ Gagal Mengupdate Status",
        description: "Terjadi kesalahan saat mengupdate status",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus permintaan ini?')) return;

    try {
      const res = await fetch(`/api/permintaan-barang/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({
          variant: "success",
          title: "✅ Permintaan Dihapus",
          description: "Permintaan barang berhasil dihapus",
        });
        fetchRequests();
      } else {
        toast({
          variant: "error",
          title: "❌ Gagal Menghapus",
          description: "Terjadi kesalahan saat menghapus permintaan",
        });
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        variant: "error",
        title: "❌ Gagal Menghapus",
        description: "Terjadi kesalahan saat menghapus permintaan",
      });
    }
  };

  const handleOpenCreateProductModal = (request: ProductRequest) => {
    setSelectedRequest(request);
    // Pre-fill category if available
    const initialCategoryId = request.categoryId ? request.categoryId.toString() : '';
    
    // If category is pre-filled, generate variants immediately
    if (initialCategoryId) {
      const category = categories.find(c => c.id === request.categoryId);
      if (category && category.priceTypes && category.priceTypes.length > 0) {
        const newVariants = category.priceTypes.map(priceType => ({
          priceType,
          price: '',
          stock_online: '',
          stock_offline: '',
          length: '',
          width: '',
          height: '',
          weight: '',
        }));
        setProductFormData({
          categoryId: initialCategoryId,
          variants: newVariants,
        });
      } else {
        setProductFormData({
          categoryId: initialCategoryId,
          variants: [],
        });
      }
    } else {
      setProductFormData({
        categoryId: '',
        variants: [],
      });
    }
    setShowCreateProductModal(true);
  };

  const handleCategoryChange = (categoryId: string) => {
    if (!categoryId) {
      setProductFormData({ ...productFormData, categoryId: '', variants: [] });
      return;
    }

    const parsedCategoryId = parseInt(categoryId);
    const category = categories.find(c => c.id === parsedCategoryId);
    
    console.log('Selected category ID:', categoryId);
    console.log('Available categories:', categories);
    console.log('Found category:', category);
    
    if (category && category.priceTypes && category.priceTypes.length > 0) {
      const newVariants = category.priceTypes.map(priceType => ({
        priceType,
        price: '',
        stock_online: '',
        stock_offline: '',
        length: '',
        width: '',
        height: '',
        weight: '',
      }));
      console.log('Generated variants:', newVariants);
      setProductFormData({ categoryId, variants: newVariants });
    } else {
      // If category not found or no price types, still set categoryId but empty variants
      setProductFormData({ ...productFormData, categoryId, variants: [] });
      console.warn('Category not found or has no price types:', categoryId, 'Available:', categories);
    }
  };

  const updateVariant = (index: number, field: string, value: string) => {
    const newVariants = [...productFormData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setProductFormData({ ...productFormData, variants: newVariants });
  };

  const handleCreateProduct = async () => {
    if (!selectedRequest) return;

    if (!productFormData.categoryId || productFormData.variants.length === 0) {
      toast({
        variant: "error",
        title: "❌ Form Tidak Lengkap",
        description: "Harap pilih kategori dan isi varian harga",
      });
      return;
    }

    setCreatingProduct(true);
    try {
      const res = await fetch(`/api/permintaan-barang/${selectedRequest.id}/create-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productFormData),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          variant: "success",
          title: "✅ Produk Berhasil Ditambahkan!",
          description: data.message || "Produk telah ditambahkan dan notifikasi telah dikirim ke pelanggan",
        });
        setShowCreateProductModal(false);
        setSelectedRequest(null);
        fetchRequests();
      } else {
        const errorData = await res.json();
        toast({
          variant: "error",
          title: "❌ Gagal Menambahkan Produk",
          description: errorData.error || "Terjadi kesalahan saat menambahkan produk",
        });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        variant: "error",
        title: "❌ Gagal Menambahkan Produk",
        description: "Terjadi kesalahan saat menambahkan produk",
      });
    } finally {
      setCreatingProduct(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Menunggu',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      completed: 'Selesai',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = 
      request.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.customerPhone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
          <p className="text-gray-600">Memuat data permintaan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Permintaan Barang</h1>
          <p className="text-gray-600">Kelola permintaan pengadaan barang dari pelanggan</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600 mb-1">Total Permintaan</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600 mb-1">Menunggu</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600 mb-1">Disetujui</div>
              <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600 mb-1">Selesai</div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-gray-200">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Cari nama produk, pelanggan, atau nomor telepon..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ffd700]"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu</option>
                  <option value="approved">Disetujui</option>
                  <option value="rejected">Ditolak</option>
                  <option value="completed">Selesai</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Tidak Ada Permintaan</h3>
                <p className="text-gray-600">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Tidak ada permintaan yang sesuai dengan filter'
                    : 'Belum ada permintaan barang dari pelanggan'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              {request.productName}
                            </h3>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                {getStatusIcon(request.status)}
                                {getStatusLabel(request.status)}
                              </span>
                              {request.category && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                                  {request.category.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">Pelanggan:</span>
                          <span>{request.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">Kontak:</span>
                          <span>{request.customerPhone}</span>
                        </div>
                        {request.notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            <span className="font-medium">Catatan:</span> {request.notes}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          Dibuat: {formatDate(request.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:w-48">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateStatus(request.id, 'approved')}
                            disabled={updatingStatus === request.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {updatingStatus === request.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3 mr-1" />
                            )}
                            Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(request.id, 'rejected')}
                            disabled={updatingStatus === request.id}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Tolak
                          </Button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleOpenCreateProductModal(request)}
                            className="bg-[#ffd700] hover:bg-[#e6c200] text-gray-900"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Tambah Produk
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateStatus(request.id, 'completed')}
                            disabled={updatingStatus === request.id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {updatingStatus === request.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            )}
                            Tandai Selesai
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(request.id)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Product Modal */}
        {showCreateProductModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateProductModal(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6 border-b pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Tambah Produk dari Permintaan</h2>
                    <p className="text-sm text-gray-600 mt-1">Produk: {selectedRequest.productName}</p>
                  </div>
                  <button
                    onClick={() => setShowCreateProductModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="categoryId">Kategori <span className="text-red-500">*</span></Label>
                    <select
                      id="categoryId"
                      value={productFormData.categoryId}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700] focus-visible:border-[#ffd700]"
                      required
                    >
                      <option value="">Pilih Kategori</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {productFormData.variants.length > 0 && (
                    <div>
                      <Label>Varian Harga <span className="text-red-500">*</span></Label>
                      <div className="mt-2 space-y-4">
                        {productFormData.variants.map((variant, index) => (
                          <Card key={index} className="border-gray-200">
                            <CardContent className="pt-4">
                              <h4 className="font-semibold text-gray-900 mb-3 capitalize">{variant.priceType}</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`price-${index}`}>Harga (Rp)</Label>
                                  <Input
                                    id={`price-${index}`}
                                    type="number"
                                    value={variant.price}
                                    onChange={(e) => updateVariant(index, 'price', e.target.value)}
                                    placeholder="0"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`stock_online-${index}`}>Stok Online</Label>
                                  <Input
                                    id={`stock_online-${index}`}
                                    type="number"
                                    value={variant.stock_online}
                                    onChange={(e) => updateVariant(index, 'stock_online', e.target.value)}
                                    placeholder="0"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`stock_offline-${index}`}>Stok Offline</Label>
                                  <Input
                                    id={`stock_offline-${index}`}
                                    type="number"
                                    value={variant.stock_offline}
                                    onChange={(e) => updateVariant(index, 'stock_offline', e.target.value)}
                                    placeholder="0"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`weight-${index}`}>Berat (gram)</Label>
                                  <Input
                                    id={`weight-${index}`}
                                    type="number"
                                    value={variant.weight}
                                    onChange={(e) => updateVariant(index, 'weight', e.target.value)}
                                    placeholder="0"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`length-${index}`}>Panjang (cm)</Label>
                                  <Input
                                    id={`length-${index}`}
                                    type="number"
                                    value={variant.length}
                                    onChange={(e) => updateVariant(index, 'length', e.target.value)}
                                    placeholder="0"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`width-${index}`}>Lebar (cm)</Label>
                                  <Input
                                    id={`width-${index}`}
                                    type="number"
                                    value={variant.width}
                                    onChange={(e) => updateVariant(index, 'width', e.target.value)}
                                    placeholder="0"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`height-${index}`}>Tinggi (cm)</Label>
                                  <Input
                                    id={`height-${index}`}
                                    type="number"
                                    value={variant.height}
                                    onChange={(e) => updateVariant(index, 'height', e.target.value)}
                                    placeholder="0"
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={handleCreateProduct}
                      disabled={creatingProduct}
                      className="flex-1 bg-[#ffd700] hover:bg-[#e6c200] text-gray-900"
                    >
                      {creatingProduct ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Menambahkan...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Tambah Produk & Kirim Notifikasi
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateProductModal(false)}
                      className="flex-1"
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

