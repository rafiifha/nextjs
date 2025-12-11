import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Package, Truck, Shield, ArrowRight, DollarSign, Users, Award } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col bg-white">
      {/* Hero Section */}
      <section className="bg-white py-16 sm:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Toko{' '}
              <span className="text-[#ffd700]">Naning</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Supplier sembako terpercaya dengan harga grosir terbaik. 
              Stok lengkap, harga kompetitif, dan pelayanan cepat untuk kebutuhan usaha Anda.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/pesanan">
                <Button size="lg" className="w-full sm:w-auto px-8">
                  Pesan Sekarang
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/produk">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                  Lihat Katalog
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Mengapa Pilih Toko Naning?
            </h2>
            <p className="text-lg text-gray-600">
              Solusi terbaik untuk kebutuhan grosir sembako Anda
            </p>
          </div>
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-[#ffd700]/20">
                    <DollarSign className="h-6 w-6 text-[#ffd700]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Harga Grosir Terbaik
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Harga grosir yang sangat kompetitif dengan sistem dus, pak, dan renceng. 
                    Semakin banyak beli, semakin hemat.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                    <Package className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Stok Lengkap & Terjamin
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Stok sembako lengkap dan selalu tersedia. 
                    Berbagai varian produk dengan kualitas terjamin untuk kebutuhan usaha Anda.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                    <Truck className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Pengiriman Cepat & Aman
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Layanan pengiriman. 
                    Pilihan pickup atau delivery dengan berbagai kurir terpercaya.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Pembayaran Fleksibel
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Sistem pembayaran aman dan fleksibel. 
                    Mendukung berbagai metode pembayaran untuk kenyamanan transaksi Anda.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Pelayanan Profesional
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Tim kami siap membantu anda. 
                    Respon cepat dan solusi tepat untuk setiap kebutuhan grosir Anda.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                    <Award className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Kualitas Terjamin
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Semua produk sembako berkualitas tinggi dengan standar terbaik. 
                    Fresh dan terjamin keasliannya untuk kepuasan pelanggan.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Kategori Produk
            </h2>
            <p className="text-lg text-gray-600">
              Berbagai kategori dengan harga grosir terbaik
            </p>
          </div>
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border border-gray-200 bg-white text-center hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <Package className="h-10 w-10 text-[#ffd700] mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900">Rokok</h3>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 bg-white text-center hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <Package className="h-10 w-10 text-[#ffd700] mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900">Sembako</h3>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 bg-white text-center hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <Package className="h-10 w-10 text-[#ffd700] mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900">Mie Instan</h3>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 bg-white text-center hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <Package className="h-10 w-10 text-[#ffd700] mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900">Snack & Camilan</h3>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 bg-white text-center hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <Package className="h-10 w-10 text-[#ffd700] mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900">Minuman</h3>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 bg-white text-center hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <Package className="h-10 w-10 text-[#ffd700] mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900">Susu & Produk Olahan</h3>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 bg-white text-center hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <Package className="h-10 w-10 text-[#ffd700] mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900">Kebutuhan Dapur</h3>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 bg-white text-center hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <Package className="h-10 w-10 text-[#ffd700] mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900">Lainnya</h3>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Toko Naning dalam Angka
            </h2>
            <p className="text-lg text-gray-600">
              Bukti komitmen kami melayani kebutuhan Anda
            </p>
          </div>
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-[#ffd700] mb-2">500+</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">Produk Sembako</div>
                <div className="text-sm text-gray-600">Stok lengkap berbagai kategori</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-[#ffd700] mb-2">98%</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">Kepuasan Pelanggan</div>
                <div className="text-sm text-gray-600">Rating tinggi dari mitra</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-[#ffd700]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Siap Memulai Bisnis Grosir Sembako?
            </h2>
            <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
              Dapatkan harga grosir terbaik dengan stok lengkap. 
              Mulai pesan sekarang dan tingkatkan keuntungan bisnis Anda!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/checkout">
                <Button size="lg" variant="secondary" className="px-8 bg-white text-gray-900 hover:bg-gray-50 font-semibold shadow-lg">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Pesan Sekarang
                </Button>
              </Link>
              <Link href="/produk">
                <Button size="lg" variant="outline" className="px-8 border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white">
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
