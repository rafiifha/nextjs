'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Package, Send, CheckCircle, Loader2 } from 'lucide-react';

export default function PermintaanBarangPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    productName: '',
    categoryId: '',
    customerName: '',
    customerPhone: '',
    notes: '',
  });

  useEffect(() => {
    fetchCategories();
    
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setIsAuthenticated(true);
        // Pre-fill form dengan data user
        setFormData(prev => ({
          ...prev,
          customerName: userData.name || '',
          customerPhone: userData.phone || userData.email || '',
        }));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productName || !formData.customerName || !formData.customerPhone) {
      toast({
        variant: "error",
        title: "❌ Form Tidak Lengkap",
        description: "Harap isi nama produk, nama, dan nomor whatsapp",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/permintaan-barang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({
          variant: "success",
          title: "✅ Permintaan Berhasil Dikirim!",
          description: "Admin akan meninjau permintaan Anda dan menghubungi Anda segera.",
        });
        // Reset form
        setFormData({
          productName: '',
          categoryId: '',
          customerName: user?.name || '',
          customerPhone: user?.phone || user?.email || '',
          notes: '',
        });
      } else {
        const data = await res.json();
        toast({
          variant: "error",
          title: "❌ Gagal Mengirim Permintaan",
          description: data.error || "Terjadi kesalahan saat mengirim permintaan",
        });
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        variant: "error",
        title: "❌ Gagal Mengirim Permintaan",
        description: "Terjadi kesalahan saat mengirim permintaan",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Permintaan Barang</h1>
          <p className="text-gray-600">
            Tidak menemukan barang yang Anda cari? Kirim permintaan pengadaan barang baru
          </p>
        </div>

        <Card className="border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#ffd700]" />
              Form Permintaan Barang
            </CardTitle>
            <CardDescription>
              Isi form di bawah ini untuk meminta pengadaan barang yang belum tersedia di toko
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="productName">
                  Nama Produk <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="productName"
                  type="text"
                  placeholder="Contoh: Beras Premium 5kg"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="categoryId">Kategori (Opsional)</Label>
                <select
                  id="categoryId"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700] focus-visible:border-[#ffd700] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Pilih Kategori (Opsional)</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="customerName">
                  Nama Anda <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customerName"
                  type="text"
                  placeholder="Nama lengkap"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="customerPhone">
                  Nomor WhatsApp / Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customerPhone"
                  type="text"
                  placeholder="081234567890 atau email@example.com"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Contoh: Merek tertentu, ukuran, atau informasi lain yang diperlukan"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-gray-900"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Kirim Permintaan
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Informasi:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Admin akan meninjau permintaan Anda dalam waktu 1x24 jam</li>
                    <li>Anda akan dihubungi melalui nomor whatsapp/email yang Anda berikan</li>
                    <li>Status permintaan dapat dilihat di halaman ini setelah login</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

