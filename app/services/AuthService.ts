import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/services/whatsappService';

export class AuthService {
  async login(data: any) {
    const { email, phone, password } = data;

    if (!password || (!email && !phone)) {
      throw new Error('Email/Phone dan password harus diisi');
    }

    const whereClause: any = { OR: [] };
    if (email) whereClause.OR.push({ email });
    if (phone) whereClause.OR.push({ phone });

    if (whereClause.OR.length === 0) {
      throw new Error('Email atau nomor whatsapp harus diisi');
    }

    const user = await prisma.user.findFirst({
      where: whereClause,
    });

    if (!user) {
      throw new Error('Email/Phone atau password salah');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error('Email/Phone atau password salah');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      message: 'Login berhasil',
      token,
      user: userWithoutPassword,
    };
  }

  async register(data: any) {
    const { name, email, phone, password } = data;

    if (!name || !password || (!email && !phone)) {
      throw new Error('Nama, email/phone, dan password harus diisi');
    }

    const whereClause: any = { OR: [] };
    if (email) whereClause.OR.push({ email });
    if (phone) whereClause.OR.push({ phone });

    const existingUser = whereClause.OR.length > 0 
      ? await prisma.user.findFirst({ where: whereClause })
      : null;

    if (existingUser) {
      throw new Error('Email atau nomor whatsapp sudah terdaftar');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        password: hashedPassword,
        role: 'customer',
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      message: 'Registrasi berhasil',
      token,
      user: userWithoutPassword,
    };
  }

  async forgotPassword(identifier: string) {
    if (!identifier) {
      throw new Error('Email atau nomor WhatsApp harus diisi');
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ]
      }
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan');
    }

    const newPassword = Math.random().toString(36).slice(-6).toUpperCase();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    if (user.phone) {
      try {
        const message = `🔑 *Reset Password - Toko Naning*\n\nHalo ${user.name},\nPassword Anda telah direset. Berikut adalah password baru Anda:\n\n*${newPassword}*\n\nSilakan login menggunakan password baru ini dan segera ubah password Anda di halaman Profil demi keamanan.\n\nTerima kasih.`;
        await sendWhatsAppMessage(user.phone, message);
      } catch (waError) {
        console.error('Failed to send WA message for reset password:', waError);
      }
    }

    return { success: true, message: 'Password berhasil direset' };
  }
}
