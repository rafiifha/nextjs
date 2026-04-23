import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Package, Truck, ArrowRight, DollarSign, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col bg-white">
      <section className="bg-gradient-to-b from-[#fff8d6] to-white py-14 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center rounded-full border border-[#ffd700]/40 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                Supplier sembako grosir
              </div>
              <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
                Belanja grosir lebih cepat di <span className="text-[#d4a800]">Toko Naning</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-xl">
                Stok lengkap, harga stabil, proses order simpel. Cocok untuk warung, toko kelontong, dan reseller.
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
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-600" /> Harga grosir</span>
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-600" /> Stok terpantau</span>
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-600" /> Pembayaran fleksibel</span>
              </div>
            </div>

            <Card className="border-gray-200 shadow-lg">
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-5">Kenapa pelanggan pilih kami</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-yellow-100 p-2"><DollarSign className="h-4 w-4 text-yellow-700" /></div>
                    <div>
                      <p className="font-medium text-gray-900">Harga lebih kompetitif</p>
                      <p className="text-sm text-gray-600">Cocok untuk belanja rutin dan restok.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-blue-100 p-2"><Package className="h-4 w-4 text-blue-700" /></div>
                    <div>
                      <p className="font-medium text-gray-900">Stok varian jelas</p>
                      <p className="text-sm text-gray-600">Online/offline dipisah, minim salah input.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-purple-100 p-2"><Truck className="h-4 w-4 text-purple-700" /></div>
                    <div>
                      <p className="font-medium text-gray-900">Pengiriman terkontrol</p>
                      <p className="text-sm text-gray-600">Zona ongkir jelas dan update status real-time.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-[#d4a800]">500+</div>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Produk aktif</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-[#d4a800]">98%</div>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Kepuasan pelanggan</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-[#d4a800]">24/7</div>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Monitoring pesanan</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-[#d4a800]">1 Hari</div>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Rata-rata proses</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16 bg-gray-50 border-y border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Siap restok untuk usaha?
            </h2>
            <p className="mt-3 text-gray-600">
              Mulai dari katalog, pilih varian, checkout, selesai. Tidak ribet.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/checkout">
                <Button size="lg" className="px-8">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Pesan Sekarang
                </Button>
              </Link>
              <Link href="/produk">
                <Button size="lg" variant="outline" className="px-8">
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
