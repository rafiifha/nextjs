'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on login, register, admin, kurir, and payment pages
  if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/kurir') ||
    pathname?.startsWith('/payment')
  ) {
    return null;
  }

  return (
    <footer className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-300 border-t border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          {/* Column 1: Brand Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="p-2 bg-gradient-to-tr from-amber-500 to-[#ffd700] rounded-xl transition-all duration-300 group-hover:scale-105 shadow-lg shadow-amber-500/20">
                <ShoppingBag className="h-5 w-5 text-slate-950" />
              </div>
              <div>
                <div className="font-bold text-white text-lg tracking-wide">Toko Naning</div>
                <div className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">Toko Sembako Terpercaya</div>
              </div>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Toko sembako terpercaya dengan kualitas terbaik dan harga terjangkau untuk memenuhi seluruh kebutuhan usaha serta harian Anda.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider border-b border-slate-800 pb-2">Tautan Cepat</h3>
            <ul className="space-y-2.5">
              {[
                { name: 'Beranda', href: '/' },
                { name: 'Produk', href: '/produk' },
                { name: 'Pesan Sekarang', href: '/checkout' },
                { name: 'Riwayat Pesanan', href: '/pesanan' },
                { name: 'Masuk Ke Akun', href: '/login' },
              ].map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-[#ffd700] hover:translate-x-1 inline-block transition-all duration-300">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider border-b border-slate-800 pb-2">Kontak Kami</h3>
            <ul className="space-y-3.5">
              <li className="flex items-center gap-3 text-sm">
                <div className="p-1.5 bg-slate-800/80 rounded-md text-amber-400">
                  <Phone className="h-4 w-4" />
                </div>
                <span className="text-slate-300 hover:text-white transition-colors">0857 3246 3329</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <div className="p-1.5 bg-slate-800/80 rounded-md text-amber-400 mt-0.5">
                  <MapPin className="h-4 w-4" />
                </div>
                <span className="text-slate-300 leading-relaxed">Jl. Raya Cicalengka - Majalaya KM 1, Cikuya, Cicalengka</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Operational Hours */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider border-b border-slate-800 pb-2">Jam Operasional</h3>
            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800/50 space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-400">
                <span>Senin - Minggu</span>
                <span className="text-amber-400">Buka Setiap Hari</span>
              </div>
              <p className="text-lg font-semibold text-white tracking-wide">06:00 - 18:00 <span className="text-xs font-normal text-slate-400">WIB</span></p>
              <p className="text-[11px] text-slate-500 pt-1">Pemesanan online dilayani 24 jam, pengiriman dilakukan pada jam operasional.</p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Area */}
        <div className="border-t border-slate-800/80 mt-12 pt-8 flex flex-col items-center justify-center gap-3 text-xs text-slate-500 text-center">
          <p>&copy; {new Date().getFullYear()} Toko Naning. Hak Cipta Dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}

