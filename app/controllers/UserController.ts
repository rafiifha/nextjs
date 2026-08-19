import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '../services/UserService';

/**
 * Controller untuk mengelola data Pengguna (User).
 * Menyediakan fungsi pembaruan profil customer, manajemen pegawai/kasir (tambah, edit, hapus, reset password kasir).
 */
export class UserController {
  private userService: UserService;

  /**
   * Menghubungkan controller dengan UserService.
   */
  constructor() {
    this.userService = new UserService();
  }

  /**
   * Memperbarui informasi profil pengguna yang sedang login (nama, email, phone, password).
   * HTTP PUT /api/user/profil
   */
  async updateProfile(request: NextRequest) {
    try {
      // 1. Memeriksa keberadaan JWT Token pada header Authorization untuk keamanan
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      // 2. Memanggil service untuk memproses pembaruan data profil
      const updatedUser = await this.userService.updateProfile(body);

      return NextResponse.json(updatedUser);
    } catch (error: any) {
      console.error('Update profile error:', error);

      // Menangani error validasi data wajib (status 400 Bad Request)
      if (error.message === 'ID dan Nama harus diisi') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Menangani error duplikasi data unik email/whatsapp (Prisma unique constraint error P2002)
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Email atau nomor whatsapp sudah digunakan' }, { status: 400 });
      }

      return NextResponse.json(
        { error: 'Gagal memperbarui profil' },
        { status: 500 }
      );
    }
  }

  /**
   * Mengambil daftar seluruh akun pegawai yang memiliki role 'kasir'.
   * HTTP GET /api/auth/employees
   */
  async getEmployees(request: NextRequest) {
    try {
      const employees = await this.userService.getEmployees();
      return NextResponse.json(employees);
    } catch (error) {
      console.error('Get employees error:', error);
      return NextResponse.json({ error: 'Gagal mengambil data kasir' }, { status: 500 });
    }
  }

  /**
   * Mendaftarkan akun kasir baru (oleh Admin).
   * HTTP POST /api/auth/employees
   */
  async createEmployee(request: NextRequest) {
    try {
      const body = await request.json();
      // Memproses penambahan kasir baru di UserService
      const employee = await this.userService.createEmployee(body);
      return NextResponse.json(employee, { status: 201 });
    } catch (error: any) {
      console.error('Create employee error:', error);

      // Menangani error validasi input wajib
      if (error.message === 'Nama, nomor HP, dan password wajib diisi') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Menangani error jika nomor HP kasir sudah digunakan oleh akun lain (status 409 Conflict)
      if (error?.code === 'P2002') {
        return NextResponse.json({ error: 'Nomor HP sudah dipakai' }, { status: 409 });
      }

      return NextResponse.json({ error: 'Gagal membuat akun kasir' }, { status: 500 });
    }
  }

  /**
   * Mereset password akun kasir (oleh Admin).
   * HTTP POST /api/auth/reset-password
   */
  async resetEmployeePassword(request: NextRequest) {
    try {
      const body = await request.json();
      const userId = Number(body?.userId);
      const newPassword = String(body?.newPassword || '');

      // Memanggil fungsi reset password pegawai di UserService
      const result = await this.userService.resetEmployeePassword(userId, newPassword);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Reset password error:', error);

      if (error.message === 'userId dan newPassword wajib diisi') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error.message === 'User kasir tidak ditemukan') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json({ error: 'Gagal reset password' }, { status: 500 });
    }
  }

  /**
   * Memperbarui data profil akun kasir (oleh Admin).
   * HTTP PUT /api/auth/employees/[id]
   */
  async updateEmployee(request: NextRequest, userId: number) {
    try {
      const body = await request.json();
      // Memanggil fungsi update kasir di UserService
      const result = await this.userService.updateEmployee(userId, body);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Update employee error:', error);
      if (error.message === 'User kasir tidak ditemukan') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error?.code === 'P2002') {
        return NextResponse.json({ error: 'Nomor HP sudah dipakai' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message || 'Gagal update kasir' }, { status: 500 });
    }
  }

  /**
   * Menghapus akun kasir (oleh Admin).
   * HTTP DELETE /api/auth/employees/[id]
   */
  async deleteEmployee(userId: number) {
    try {
      // Memanggil fungsi penghapusan akun kasir di UserService
      const result = await this.userService.deleteEmployee(userId);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Delete employee error:', error);
      if (error.message === 'User kasir tidak ditemukan') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: error.message || 'Gagal hapus kasir' }, { status: 500 });
    }
  }
}
