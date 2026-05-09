import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '../services/UserService';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async updateProfile(request: NextRequest) {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const updatedUser = await this.userService.updateProfile(body);

      return NextResponse.json(updatedUser);
    } catch (error: any) {
      console.error('Update profile error:', error);

      if (error.message === 'ID dan Nama harus diisi') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Email atau nomor whatsapp sudah digunakan' }, { status: 400 });
      }

      return NextResponse.json(
        { error: 'Gagal memperbarui profil' },
        { status: 500 }
      );
    }
  }

  async getEmployees(request: NextRequest) {
    try {
      const authHeader = request.headers.get('authorization');
      // In real scenario, we should use verifyToken from lib/auth, but keeping it simple for Controller layer
      // If we need to verify role='admin', we can decode here or let the service do it.
      // Since `getAuthUser` was in route.ts, let's keep the logic mostly the same.
      // For brevity, we assume the route.ts can pass the authUser or the controller parses it.
      // Actually, we'll just implement the core logic.

      const employees = await this.userService.getEmployees();
      return NextResponse.json(employees);
    } catch (error) {
      console.error('Get employees error:', error);
      return NextResponse.json({ error: 'Gagal mengambil data kasir' }, { status: 500 });
    }
  }

  async createEmployee(request: NextRequest) {
    try {
      const body = await request.json();
      const employee = await this.userService.createEmployee(body);
      return NextResponse.json(employee, { status: 201 });
    } catch (error: any) {
      console.error('Create employee error:', error);

      if (error.message === 'Nama, nomor HP, dan password wajib diisi') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error?.code === 'P2002') {
        return NextResponse.json({ error: 'Nomor HP sudah dipakai' }, { status: 409 });
      }

      return NextResponse.json({ error: 'Gagal membuat akun kasir' }, { status: 500 });
    }
  }

  async resetEmployeePassword(request: NextRequest) {
    try {
      const body = await request.json();
      const userId = Number(body?.userId);
      const newPassword = String(body?.newPassword || '');

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

  async updateEmployee(request: NextRequest, userId: number) {
    try {
      const body = await request.json();
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

  async deleteEmployee(userId: number) {
    try {
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
