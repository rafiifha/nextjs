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
      if (errorMessage === 'Nama, email/phone, dan password harus diisi' || errorMessage === 'Email atau nomor whatsapp sudah terdaftar') {
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
      
      return NextResponse.json(
        { error: errorMessage || 'Terjadi kesalahan saat registrasi' },
        { status: 500 }
      );
    }
  }

  async forgotPassword(request: NextRequest) {
    try {
      const { identifier } = await request.json();
      const result = await this.authService.forgotPassword(identifier);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Lupa password error:', error);
      
      if (error.message === 'Email atau nomor WhatsApp harus diisi') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      if (error.message === 'Pengguna tidak ditemukan') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      
      return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
    }
  }
}
