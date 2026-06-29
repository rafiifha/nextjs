import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../services/AuthService';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(request: NextRequest) {
    try {
      const body = await request.json();
      const result = await this.authService.login(body);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Login error:', error);
      
      const errorMessage = error.message;
      if (errorMessage === 'Email/Phone dan password harus diisi' || errorMessage === 'Email atau nomor whatsapp harus diisi') {
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
      
      if (errorMessage === 'Email/Phone atau password salah') {
        return NextResponse.json({ error: errorMessage }, { status: 401 });
      }
      
      if (errorMessage?.includes("Can't reach database server") || error.code === 'P1001') {
        return NextResponse.json(
          { error: 'Tidak dapat terhubung ke database. Silakan coba lagi nanti.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: errorMessage || 'Terjadi kesalahan saat login' },
        { status: 500 }
      );
    }
  }

  async register(request: NextRequest) {
    try {
      const body = await request.json();
      const result = await this.authService.register(body);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Register error:', error);
      
      const errorMessage = error.message;
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

  async sendOtp(request: NextRequest) {
    try {
      const { phone, type } = await request.json();
      const result = await this.authService.sendOtp(phone, type);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Send OTP error:', error);

      const errorMessage = error.message;
      if (
        errorMessage === 'Nomor WhatsApp harus diisi' ||
        errorMessage === 'Nomor WhatsApp sudah terdaftar' ||
        errorMessage === 'Nomor WhatsApp tidak terdaftar' ||
        errorMessage === 'Gagal mengirim OTP. Pastikan nomor WhatsApp aktif.'
      ) {
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }

      return NextResponse.json(
        { error: errorMessage || 'Terjadi kesalahan saat mengirim OTP' },
        { status: 500 }
      );
    }
  }

  async verifyOtp(request: NextRequest) {
    try {
      const { phone, code, type } = await request.json();
      const result = await this.authService.verifyOtp(phone, code, type);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Verify OTP error:', error);

      const errorMessage = error.message;
      if (
        errorMessage === 'Nomor WhatsApp dan kode OTP harus diisi' ||
        errorMessage === 'Kode OTP tidak ditemukan. Silakan minta kode baru.' ||
        errorMessage === 'Kode OTP sudah kadaluarsa. Silakan minta kode baru.' ||
        errorMessage === 'Kode OTP salah'
      ) {
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }

      return NextResponse.json(
        { error: errorMessage || 'Terjadi kesalahan saat verifikasi OTP' },
        { status: 500 }
      );
    }
  }

  async forgotPassword(request: NextRequest) {
    try {
      const { identifier, newPassword } = await request.json();
      const result = await this.authService.forgotPassword(identifier, newPassword);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Lupa password error:', error);
      
      if (error.message === 'Nomor WhatsApp harus diisi') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
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
