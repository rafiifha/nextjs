import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Package, Truck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ProductService } from '@/app/services/ProductService';
import { formatRupiah } from '@/lib/utils';

/**
 * Halaman Utama (Landing Page / Home) untuk Pelanggan.
 * Menyediakan informasi profil singkat Toko Naning, kelebihan toko,
 * panduan tata cara pemesanan sembako, dan tombol navigasi langsung ke katalog produk.
 */
export default async function Home() {
  const productService = new ProductService();
  const allProducts = await productService.getAllProducts();
  // Mengambil 4 produk terlaris
  const topProducts = allProducts.slice(0, 4);

  return (
    <div className="flex flex-col bg-white">
      {/* SECTION HERO: Judul Utama, Tagline & Tombol Navigasi Utama */}
      <section className="bg-gradient-to-b from-[#fff8d6] to-white py-14 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center rounded-full border border-[#ffd700]/40 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                Toko sembako terpercaya
              </div>
              <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
                Belanja sembako mudah di <span className="text-[#d4a800]">Toko Naning</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-xl">
                Pesan kebutuhan sembako langsung dari sini. Praktis, cepat, tanpa ribet.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link href="/produk">
                  <Button size="lg" className="w-full sm:w-auto">
                    Lihat Katalog
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/checkout">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Pesan Sekarang
                  </Button>
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-600" /> Harga terjangkau</span>
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-600" /> Stok terpantau</span>
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-600" /> Pembayaran fleksibel</span>
              </div>
            </div>

            {/* SECTION CARA PESAN: Alur 3 Langkah Sederhana Pemesanan Sembako */}
            <Card className="border-gray-200 shadow-lg">
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-5">Cara pesan</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-yellow-100 p-2"><Package className="h-4 w-4 text-yellow-700" /></div>
                    <div>
                      <p className="font-medium text-gray-900">Pilih produk</p>
                      <p className="text-sm text-gray-600">Cari produk yang dibutuhkan di katalog.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-blue-100 p-2"><ShoppingCart className="h-4 w-4 text-blue-700" /></div>
                    <div>
                      <p className="font-medium text-gray-900">Checkout</p>
                      <p className="text-sm text-gray-600">Isi data pengiriman dan pilih pembayaran.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-purple-100 p-2"><Truck className="h-4 w-4 text-purple-700" /></div>
                    <div>
                      <p className="font-medium text-gray-900">Diantar</p>
                      <p className="text-sm text-gray-600">Pesanan diproses dan dikirim ke lokasi.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION PRODUK TERLARIS */}
      {topProducts.length > 0 && (
        <section className="py-14 sm:py-16 bg-white border-y border-gray-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Produk Paling Banyak Dibeli</h2>
                <p className="mt-2 text-gray-600">Pilihan favorit pelanggan Toko Naning</p>
              </div>
              <Link href="/produk" className="hidden sm:inline-flex items-center text-sm font-medium text-[#d4a800] hover:text-[#b38a00]">
                Lihat semua produk
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {topProducts.map((product) => {
                const firstVariant = product.variants && product.variants.length > 0 
                  ? product.variants.find((v: any) => v.price !== null) || product.variants[0]
                  : null;
                  
                return (
                  <Link href="/produk" key={product.id} className="block group">
                    <Card className="h-full border-gray-200 shadow-sm group-hover:shadow-md transition-all duration-200 overflow-hidden">
                      <div className="relative h-48 w-full bg-gray-100 flex-shrink-0">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-yellow-100 to-amber-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                            <Package className="h-12 w-12 text-amber-500/70" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-blue-100 text-blue-700 uppercase tracking-wider mb-2 inline-block">
                          {product.category?.name || 'Umum'}
                        </span>
                        <h3 className="text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-[#d4a800] transition-colors">{product.name}</h3>
                        
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900">
                            {firstVariant && firstVariant.price ? formatRupiah(firstVariant.price) : 'Cek Harga'}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {product.salesCount} terjual
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
            
            <div className="mt-8 text-center sm:hidden">
              <Link href="/produk">
                <Button variant="outline" className="w-full">
                  Lihat semua produk
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* SECTION CALL-TO-ACTION: Ajakan Bertindak bagi Pelanggan */}
      <section className="py-14 sm:py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Mau mulai pesan?
            </h2>
            <p className="mt-3 text-gray-600">
              Pilih produk, checkout, selesai.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/checkout">
                <Button size="lg" className="px-8 w-full sm:w-auto">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Pesan Sekarang
                </Button>
              </Link>
              <Link href="/produk">
                <Button size="lg" variant="outline" className="px-8 w-full sm:w-auto">
                  Lihat Katalog Produk
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
