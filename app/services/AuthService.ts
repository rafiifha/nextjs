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

  // ========== OTP METHODS ==========

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(phone: string, type: 'register' | 'forgot_password') {
    if (!phone) {
      throw new Error('Nomor WhatsApp harus diisi');
    }

    // Untuk register: cek nomor belum terdaftar
    if (type === 'register') {
      const existingUser = await prisma.user.findFirst({
        where: { phone },
      });
      if (existingUser) {
        throw new Error('Nomor WhatsApp sudah terdaftar');
      }
    }

    // Untuk forgot_password: cek nomor sudah terdaftar
    if (type === 'forgot_password') {
      const existingUser = await prisma.user.findFirst({
        where: { phone },
      });
      if (!existingUser) {
        throw new Error('Nomor WhatsApp tidak terdaftar');
      }
    }

    // Hapus OTP lama yang belum diverifikasi untuk phone + type ini
    await prisma.otpVerification.deleteMany({
      where: { phone, type, verified: false },
    });

    const code = this.generateOtpCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 menit

    await prisma.otpVerification.create({
      data: { phone, code, type, expiresAt },
    });

    // Kirim OTP via WhatsApp
    const typeLabel = type === 'register' ? 'Registrasi' : 'Reset Password';
    const message = `🔐 *Kode OTP ${typeLabel} - Toko Naning*\n\nKode verifikasi Anda:\n\n*${code}*\n\nKode berlaku 5 menit. Jangan bagikan kode ini kepada siapapun.`;

    try {
      await sendWhatsAppMessage(phone, message);
    } catch (error) {
      console.error('Failed to send OTP via WhatsApp:', error);
      throw new Error('Gagal mengirim OTP. Pastikan nomor WhatsApp aktif.');
    }

    return { success: true, message: 'Kode OTP berhasil dikirim ke WhatsApp Anda' };
  }

  async verifyOtp(phone: string, code: string, type: 'register' | 'forgot_password') {
    if (!phone || !code) {
      throw new Error('Nomor WhatsApp dan kode OTP harus diisi');
    }

    const otp = await prisma.otpVerification.findFirst({
      where: { phone, type, verified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new Error('Kode OTP tidak ditemukan. Silakan minta kode baru.');
    }

    if (new Date() > otp.expiresAt) {
      // Hapus OTP expired
      await prisma.otpVerification.delete({ where: { id: otp.id } });
      throw new Error('Kode OTP sudah kadaluarsa. Silakan minta kode baru.');
    }

    if (otp.code !== code) {
      throw new Error('Kode OTP salah');
    }

    // Mark as verified
    await prisma.otpVerification.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    return { success: true, message: 'Kode OTP berhasil diverifikasi' };
  }

  // ========== REGISTER (dengan OTP) ==========

  async register(data: any) {
    const { name, email, phone, password } = data;

    if (!name || !phone || !password) {
      throw new Error('Nama, nomor WhatsApp, dan password harus diisi');
    }

    // Cek OTP sudah diverifikasi
    const verifiedOtp = await prisma.otpVerification.findFirst({
      where: { phone, type: 'register', verified: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!verifiedOtp) {
      throw new Error('Nomor WhatsApp belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.');
    }

    // Cek duplikat
    const whereClause: any = { OR: [{ phone }] };
    if (email) whereClause.OR.push({ email });

    const existingUser = await prisma.user.findFirst({ where: whereClause });

    if (existingUser) {
      throw new Error('Email atau nomor WhatsApp sudah terdaftar');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        phone,
        password: hashedPassword,
        role: 'customer',
      },
    });

    // Hapus semua OTP register untuk nomor ini
    await prisma.otpVerification.deleteMany({
      where: { phone, type: 'register' },
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

  // ========== FORGOT PASSWORD (dengan OTP) ==========

  async forgotPassword(identifier: string, newPassword: string) {
    if (!identifier) {
      throw new Error('Nomor WhatsApp harus diisi');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password baru minimal 6 karakter');
    }

    const user = await prisma.user.findFirst({
      where: { phone: identifier },
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan');
    }

    // Cek OTP sudah diverifikasi
    const verifiedOtp = await prisma.otpVerification.findFirst({
      where: { phone: identifier, type: 'forgot_password', verified: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!verifiedOtp) {
      throw new Error('Nomor WhatsApp belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Hapus semua OTP forgot_password untuk nomor ini
    await prisma.otpVerification.deleteMany({
      where: { phone: identifier, type: 'forgot_password' },
    });

    return { success: true, message: 'Password berhasil diubah' };
  }
}
