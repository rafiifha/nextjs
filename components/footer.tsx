'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on login, register, admin, and payment pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/register') || pathname?.startsWith('/admin') || pathname?.startsWith('/payment')) {
    return null;
  }

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <ShoppingBag className="h-6 w-6 text-[#ffd700]" />
              <div>
                <div className="font-bold text-white text-lg">Toko Naning</div>
                <div className="text-xs text-gray-400">Grosir Sembako Terpercaya</div>
              </div>
            </Link>
            <p className="text-sm text-gray-400">
              Supplier sembako terpercaya dengan harga grosir terbaik untuk kebutuhan usaha Anda.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Tautan Cepat</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm hover:text-[#ffd700] transition-colors">
                  Beranda
                </Link>
              </li>
              <li>
                <Link href="/produk" className="text-sm hover:text-[#ffd700] transition-colors">
                  Produk
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="text-sm hover:text-[#ffd700] transition-colors">
                  Pesan Sekarang
                </Link>
              </li>
              <li>
                <Link href="/pesanan" className="text-sm hover:text-[#ffd700] transition-colors">
                  Riwayat Pesanan
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm hover:text-[#ffd700] transition-colors">
                  Masuk
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4">Kontak</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-[#ffd700]" />
                <span>0812-3456-7890</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-[#ffd700]" />
                <span>info@tokonaning.com</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-[#ffd700] mt-0.5" />
                <span>Jl. Raya Sembako No. 123, Jakarta</span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-semibold text-white mb-4">Ikuti Kami</h3>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-full hover:bg-[#ffd700] hover:text-gray-900 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-full hover:bg-[#ffd700] hover:text-gray-900 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-full hover:bg-[#ffd700] hover:text-gray-900 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Toko Naning. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

