import { prisma } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

/**
 * Service untuk memproses logika bisnis terkait profil pengguna (User) dan pegawai (kasir).
 * Berinteraksi langsung dengan database PostgreSQL menggunakan Prisma ORM.
 */
export class UserService {
  /**
   * Memperbarui profil customer yang sedang login.
   * @param data Objek berisi id, name, email, phone, dan password (opsional).
   */
  async updateProfile(data: any) {
    const { id, name, email, phone, password } = data;

    if (!id || !name) {
      throw new Error('ID dan Nama harus diisi');
    }

    // Menyiapkan data yang akan diperbarui
    const dataToUpdate: any = {
      name,
      email: email || null,
      phone: phone || null,
    };

    // Jika pengguna memasukkan password baru, lakukan hashing menggunakan bcrypt
    if (password) {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.password = await bcrypt.hash(password, salt);
    }

    // Melakukan update data user di database berdasarkan ID unik
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

  /**
   * Mengambil semua daftar pegawai yang memiliki peran 'kasir'.
   */
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
      orderBy: { createdAt: 'desc' }, // Mengurutkan dari pegawai yang paling baru didaftarkan
    });
  }

  /**
   * Membuat/mendaftarkan akun pegawai (kasir) baru (oleh Admin).
   */
  async createEmployee(data: any) {
    const name = String(data?.name || '').trim();
    const phone = String(data?.phone || '').trim();
    const password = String(data?.password || '');

    // Validasi masukan wajib
    if (!name || !phone || !password) {
      throw new Error('Nama, nomor HP, dan password wajib diisi');
    }

    // Mengenkripsi password kasir menggunakan bcrypt dengan salt rounds = 10
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Menyimpan kasir baru ke database
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

  /**
   * Mereset password pegawai kasir tertentu ke password yang baru ditentukan oleh Admin.
   */
  async resetEmployeePassword(userId: number, newPassword: string) {
    if (!Number.isFinite(userId) || !newPassword) {
      throw new Error('userId dan newPassword wajib diisi');
    }

    // Memastikan kasir tersebut benar-benar ada di database
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser || targetUser.role !== 'kasir') {
      throw new Error('User kasir tidak ditemukan');
    }

    // Hashing password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password di database
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'Password kasir berhasil direset' };
  }

  /**
   * Mengupdate data nama atau nomor HP akun kasir (oleh Admin).
   */
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

  /**
   * Menghapus akun pegawai kasir tertentu dari sistem.
   */
  async deleteEmployee(userId: number) {
    if (!Number.isFinite(userId)) {
      throw new Error('ID kasir tidak valid');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser || targetUser.role !== 'kasir') {
      throw new Error('User kasir tidak ditemukan');
    }

    // Melakukan penghapusan data pegawai di database
    await prisma.user.delete({ where: { id: userId } });
    return { success: true, message: 'Akun kasir berhasil dihapus' };
  }
}
