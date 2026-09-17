import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ShoppingCart, 
  Package, 
  Truck, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  CreditCard, 
  ShieldCheck, 
  Flame, 
  ShoppingBag,
  Zap
} from 'lucide-react';
import { ProductService } from '@/app/services/ProductService';
import { OrderService } from '@/app/services/OrderService';
import { StoreDensityCard } from '@/components/store-density-card';
import { formatRupiah } from '@/lib/utils';

/**
 * Halaman Utama (Landing Page / Home) Toko Naning.
 * Menggunakan tema warna khas kuning emas (#ffd700 & #d4a800), clean & modern,
 * dengan indikator kepadatan toko real-time (1-7 sepi, 7+ ramai) dan katalog produk terlaris.
 */
export default async function Home() {
  const productService = new ProductService();
  const orderService = new OrderService();

  const allProducts = await productService.getAllProducts();
  const initialDensity = await orderService.getStoreDensity();

  // Mengambil 4 produk terlaris
  const topProducts = allProducts.slice(0, 4);

  return (
    <div className="flex flex-col bg-slate-50/50 min-h-screen text-slate-800">
      
      {/* 1. HERO SECTION (Warna Kuning Khas Toko Naning: #fff8d6 -> white) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#fff8d6] via-[#fffdf0] to-white pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-yellow-100/60">
        {/* Subtle Ambient Background Decorative Glows */}
        <div className="absolute -top-24 -left-20 w-96 h-96 bg-[#ffd700]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-[#ffd700]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            
            {/* HERO LEFT: Tagline & Calls-to-action */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ffd700]/60 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#d4a800] animate-pulse" />
                <span>Toko sembako terpercaya • Toko Naning</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Belanja sembako mudah di{' '}
                <span className="text-[#d4a800]">
                  Toko Naning
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                Pesan kebutuhan sembako langsung dari sini. Praktis, cepat, tanpa ribet. Stok selalu dipantau real-time 
                dan siap dikirim langsung ke rumah Anda.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3.5">
                <Link href="/produk">
                  <Button size="lg" className="w-full sm:w-auto bg-[#ffd700] hover:bg-[#e6c200] text-slate-950 font-bold shadow-[#ffd700]/30 shadow-lg hover:shadow-[#ffd700]/40 hover:-translate-y-0.5 transition-all duration-200 px-7">
                    <ShoppingBag className="mr-2 h-4 w-4 text-slate-900" />
                    Lihat Katalog Produk
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/checkout">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-yellow-400 bg-white/80 text-slate-900 hover:bg-yellow-50 font-semibold px-7">
                    <ShoppingCart className="mr-2 h-4 w-4 text-[#d4a800]" />
                    Pesan Sekarang
                  </Button>
                </Link>
              </div>

              {/* Feature Badges */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium text-slate-700">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 border border-yellow-200 shadow-sm backdrop-blur-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Harga Terjangkau</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 border border-yellow-200 shadow-sm backdrop-blur-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Stok Terpantau</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 border border-yellow-200 shadow-sm backdrop-blur-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Pembayaran Fleksibel</span>
                </div>
              </div>
            </div>

            {/* HERO RIGHT: Indikator Kepadatan Toko & Cara Pesan */}
            <div className="lg:col-span-5 space-y-5">
              {/* Live Store Density Card (Yellow Brand Styling) */}
              <StoreDensityCard initialData={initialDensity} />

              {/* Step-by-Step Order Guide Card */}
              <Card className="border-yellow-200/80 bg-white/95 shadow-md backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[#d4a800] fill-[#ffd700]" />
                      Cara Pesan dalam 3 Langkah
                    </h3>
                    <span className="text-[11px] font-semibold text-yellow-900 bg-yellow-100 px-2.5 py-0.5 rounded-full border border-yellow-300">
                      Praktis
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3.5 group">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-xs font-bold text-yellow-900 group-hover:bg-[#ffd700] group-hover:text-slate-950 transition-colors">
                        1
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-[#d4a800] transition-colors">Pilih Produk</p>
                        <p className="text-xs text-slate-500">Cari produk sembako yang dibutuhkan di katalog.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 group">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-900 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        2
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Checkout</p>
                        <p className="text-xs text-slate-500">Isi data pengiriman dan pilih pembayaran.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 group">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-900 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        3
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">Diantar</p>
                        <p className="text-xs text-slate-500">Pesanan diproses dan dikirim ke lokasi Anda.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* 2. HIGHLIGHTS & KEUNGGULAN BAR */}
      <section className="py-10 bg-white border-b border-slate-100 shadow-sm relative z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="flex flex-col items-center p-3">
              <div className="p-3 rounded-2xl bg-yellow-50 text-yellow-800 mb-3 border border-yellow-200">
                <Truck className="h-6 w-6 text-[#d4a800]" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Pengiriman Antar</h4>
              <p className="text-xs text-slate-500 mt-1">Dikirim langsung ke lokasi oleh kurir toko</p>
            </div>

            <div className="flex flex-col items-center p-3">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-700 mb-3 border border-blue-200">
                <Package className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Stok Terjaga</h4>
              <p className="text-xs text-slate-500 mt-1">Sistem stok online dan offline terintegrasi</p>
            </div>

            <div className="flex flex-col items-center p-3">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 mb-3 border border-emerald-200">
                <CreditCard className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Pembayaran Fleksibel</h4>
              <p className="text-xs text-slate-500 mt-1">Dukung QRIS, Virtual Account, dan Tunai</p>
            </div>

            <div className="flex flex-col items-center p-3">
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-800 mb-3 border border-amber-200">
                <ShieldCheck className="h-6 w-6 text-amber-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Kualitas Terjamin</h4>
              <p className="text-xs text-slate-500 mt-1">Sembako bersih, rapi, dan terpercaya</p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. SECTION PRODUK TERLARIS */}
      {topProducts.length > 0 && (
        <section className="py-16 bg-white border-b border-slate-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Section Header */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-900 mb-2 border border-yellow-300">
                  <Flame className="h-3.5 w-3.5 text-[#d4a800] fill-[#ffd700]" />
                  <span>Favorit Pelanggan</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Produk Paling Banyak Dibeli
                </h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  Pilihan favorit pelanggan Toko Naning untuk kebutuhan sehari-hari
                </p>
              </div>

              <Link 
                href="/produk" 
                className="hidden sm:inline-flex items-center text-sm font-bold text-[#d4a800] hover:text-[#b38a00] transition-colors group"
              >
                Lihat semua produk 
                <ArrowRight className="ml-1.5 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {topProducts.map((product) => {
                const firstVariant = product.variants && product.variants.length > 0 
                  ? product.variants.find((v: any) => v.price !== null) || product.variants[0]
                  : null;
                  
                return (
                  <Link href="/produk" key={product.id} className="block group">
                    <Card className="h-full border-slate-200/80 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden rounded-2xl flex flex-col">
                      {/* Product Image */}
                      <div className="relative h-48 w-full bg-slate-100 overflow-hidden shrink-0">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-yellow-100 to-amber-200/60 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                            <Package className="h-12 w-12 text-[#d4a800]/70" />
                          </div>
                        )}
                        {/* Category Badge overlay */}
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-slate-800 shadow-sm backdrop-blur-md border border-slate-200 uppercase tracking-wider">
                            {product.category?.name || 'Umum'}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <CardContent className="p-5 flex flex-col flex-1 justify-between">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 line-clamp-2 group-hover:text-[#d4a800] transition-colors leading-snug">
                            {product.name}
                          </h3>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] text-slate-400 font-medium">Harga</span>
                            <span className="text-base font-extrabold text-slate-900 group-hover:text-[#d4a800] transition-colors">
                              {firstVariant && firstVariant.price ? formatRupiah(firstVariant.price) : 'Cek Harga'}
                            </span>
                          </div>
                          
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
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
                <Button variant="outline" className="w-full border-yellow-400 text-slate-900">
                  Lihat semua produk
                </Button>
              </Link>
            </div>

          </div>
        </section>
      )}

      {/* 4. CALL-TO-ACTION (CTA) BANNER (Kuning Khas Toko Naning) */}
      <section className="py-16 bg-slate-50/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-[#ffd700] via-[#e6c200] to-[#d4a800] text-slate-950 p-8 sm:p-12 shadow-xl overflow-hidden border border-yellow-400">
            {/* Ambient Lighting Accents */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-yellow-300/30 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-950/10 text-slate-950 border border-slate-950/15">
                Mau mulai pesan?
              </span>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                Pilih produk, checkout, selesai.
              </h2>

              <p className="text-slate-900/90 text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-medium">
                Nikmati kemudahan belanja kebutuhan sembako online langsung dari Toko Naning dengan pengantaran cepat dan pembayaran fleksibel.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <Link href="/checkout" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-slate-950 text-white hover:bg-slate-900 font-bold shadow-lg px-8">
                    <ShoppingCart className="mr-2 h-4 w-4 text-[#ffd700]" />
                    Pesan Sekarang
                  </Button>
                </Link>
                <Link href="/produk" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-950/30 text-slate-950 hover:bg-slate-950/10 font-bold px-8">
                    Lihat Katalog Produk
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
