import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../services/AuthService';

/**
 * Controller untuk menangani proses Otentikasi.
 * Berfungsi menerima request terkait login, register, pengiriman OTP, verifikasi OTP, dan lupa password.
 */
export class AuthController {
  private authService: AuthService;

  /**
   * Menghubungkan controller dengan AuthService yang memuat logika bisnis otentikasi.
   */
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Menangani request login pengguna.
   * HTTP POST /api/auth/login
   */
  async login(request: NextRequest) {
    try {
      // Membaca body request JSON (email, phone, password)
      const body = await request.json();
      // Memproses login melalui AuthService
      const result = await this.authService.login(body);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Login error:', error);
      
      const errorMessage = error.message;
      // Validasi input kosong (status 400 Bad Request)
      if (errorMessage === 'Email/Nomor Whatsapp dan password harus diisi' || errorMessage === 'Email atau nomor whatsapp harus diisi') {
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
      
      // Kredensial salah (status 401 Unauthorized)
      if (errorMessage === 'Email/Nomor Whatsapp atau password salah') {
        return NextResponse.json({ error: errorMessage }, { status: 401 });
      }
      
      // Penanganan jika server database tidak terjangkau (status 503 Service Unavailable)
      if (errorMessage?.includes("Can't reach database server") || error.code === 'P1001') {
        return NextResponse.json(
          { error: 'Tidak dapat terhubung ke database. Silakan coba lagi nanti.' },
          { status: 503 }
        );
      }
      
      // Kesalahan server internal lainnya (status 500)
      return NextResponse.json(
        { error: errorMessage || 'Terjadi kesalahan saat login' },
        { status: 500 }
      );
    }
  }

  /**
   * Menangani pendaftaran akun (register) customer baru.
   * HTTP POST /api/auth/register
   */
  async register(request: NextRequest) {
    try {
      const body = await request.json();
      // Memproses registrasi melalui AuthService
      const result = await this.authService.register(body);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Register error:', error);
      
      const errorMessage = error.message;
      // Menangani error validasi pendaftaran dan OTP yang tidak valid
      if (
        errorMessage === 'Nama, nomor WhatsApp, dan password harus diisi' ||
        errorMessage === 'Email atau nomor WhatsApp sudah terdaftar' ||
        errorMessage === 'Nomor WhatsApp belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.'
      ) {
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
      
      return NextResponse.json(
        { error: errorMessage || 'Terjadi kesalahan saat registrasi' },
        { status: 500 }
      );
    }
  }

  /**
   * Mengirim kode OTP ke Gmail / email pengguna.
   * HTTP POST /api/auth/otp/send
   */
  async sendOtp(request: NextRequest) {
    try {
      const { phone, email, type } = await request.json();
      const identifier = email || phone;
      // Memproses pengiriman OTP melalui AuthService
      const result = await this.authService.sendOtp(identifier, type, email);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Send OTP error:', error);

      const errorMessage = error.message;
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
  }

  /**
   * Memverifikasi kode OTP yang diinput pengguna.
   * HTTP POST /api/auth/otp/verify
   */
  async verifyOtp(request: NextRequest) {
    try {
      const { phone, email, code, type } = await request.json();
      const identifier = email || phone;
      // Memverifikasi kode OTP melalui AuthService
      const result = await this.authService.verifyOtp(identifier, code, type);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Verify OTP error:', error);

      const errorMessage = error.message;
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
  }

  /**
   * Menangani pergantian password saat pengguna lupa password.
   * HTTP POST /api/auth/forgot-password
   */
  async forgotPassword(request: NextRequest) {
    try {
      const { identifier, newPassword } = await request.json();
      // Memproses reset password setelah verifikasi OTP sukses
      const result = await this.authService.forgotPassword(identifier, newPassword);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Lupa password error:', error);
      
      if (error.message === 'Nomor WhatsApp harus diisi') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      // Pengguna tidak terdaftar (status 404 Not Found)
      if (error.message === 'Pengguna tidak ditemukan') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      if (error.message === 'Nomor WhatsApp belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
    }
  }
}
