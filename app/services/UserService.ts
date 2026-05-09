import { prisma } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

export class UserService {
  async updateProfile(data: any) {
    const { id, name, email, phone, password } = data;

    if (!id || !name) {
      throw new Error('ID dan Nama harus diisi');
    }

    const dataToUpdate: any = {
      name,
      email: email || null,
      phone: phone || null,
    };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      }
    });

    return updatedUser;
  }

  async getEmployees() {
    return await prisma.user.findMany({
      where: { role: 'kasir' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEmployee(data: any) {
    const name = String(data?.name || '').trim();
    const phone = String(data?.phone || '').trim();
    const password = String(data?.password || '');

    if (!name || !phone || !password) {
      throw new Error('Nama, nomor HP, dan password wajib diisi');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const employee = await prisma.user.create({
      data: {
        name,
        phone,
        password: hashedPassword,
        role: 'kasir',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return employee;
  }

  async resetEmployeePassword(userId: number, newPassword: string) {
    if (!Number.isFinite(userId) || !newPassword) {
      throw new Error('userId dan newPassword wajib diisi');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser || targetUser.role !== 'kasir') {
      throw new Error('User kasir tidak ditemukan');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'Password kasir berhasil direset' };
  }

  async updateEmployee(userId: number, data: { name?: string; phone?: string }) {
    if (!Number.isFinite(userId)) {
      throw new Error('ID kasir tidak valid');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser || targetUser.role !== 'kasir') {
      throw new Error('User kasir tidak ditemukan');
    }

    const updateData: any = {};
    if (data.name?.trim()) updateData.name = data.name.trim();
    if (data.phone?.trim()) updateData.phone = data.phone.trim();

    if (Object.keys(updateData).length === 0) {
      throw new Error('Tidak ada data yang diubah');
    }

    return await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
  }

  async deleteEmployee(userId: number) {
    if (!Number.isFinite(userId)) {
      throw new Error('ID kasir tidak valid');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser || targetUser.role !== 'kasir') {
      throw new Error('User kasir tidak ditemukan');
    }

    await prisma.user.delete({ where: { id: userId } });
    return { success: true, message: 'Akun kasir berhasil dihapus' };
  }
}
