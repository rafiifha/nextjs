import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';
import { sendOtpEmail } from '@/services/emailService';

/**
 * Service untuk menangani proses Otentikasi (Authentication) dan Otorisasi (Authorization).
 * Mengatur alur registrasi pengguna, verifikasi OTP WhatsApp, login, dan reset password.
 */
export class AuthService {
  /**
   * Mengotentikasi pengguna (Customer / Admin / Kurir) berdasarkan Email atau Nomor Telepon & Password.
   */
  async login(data: any) {
    const { email, phone, password } = data;

    if (!password || (!email && !phone)) {
      throw new Error('Email/Phone dan password harus diisi');
    }

    // Membangun query pencarian secara dinamis (mencari berdasarkan Email atau Nomor Telepon)
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

    // Membandingkan password yang diinput (plain text) dengan hash password yang tersimpan di DB menggunakan bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error('Email/Phone atau password salah');
    }

    // Memeriksa apakah akun masih aktif (terutama untuk kurir yang bisa dinonaktifkan)
    if (!user.isActive) {
      throw new Error('Akun Anda telah dinonaktifkan. Hubungi admin.');
    }

    // Menghasilkan JWT Token berisi payload data penting (ID, email, phone, role) untuk proses otorisasi berikutnya
    const token = generateToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
    });

    // Menghilangkan field password dari object user sebelum dikembalikan ke client demi keamanan data
    const { password: _, ...userWithoutPassword } = user;

    return {
      message: 'Login berhasil',
      token,
      user: userWithoutPassword,
    };
  }

  // OTP METHODS

  /**
   * Menghasilkan kode OTP 6-digit acak secara matematis.
   */
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Mengirimkan kode OTP ke WhatsApp pengguna via Fonnte.
   * Fungsi ini digunakan untuk proses 'register' (pendaftaran) dan 'forgot_password' (lupa password).
   */
  /**
   * Mengirimkan kode OTP verifikasi akun atau reset password via Gmail.
   */
  async sendOtp(identifier: string, type: 'register' | 'forgot_password', emailParam?: string) {
    if (!identifier) {
      throw new Error('Email atau nomor WhatsApp harus diisi');
    }

    // Tentukan alamat email tujuan pengiriman OTP
    let targetEmail = emailParam || (identifier.includes('@') ? identifier : null);

    // Memvalidasi: Jika registrasi, pastikan email atau nomor belum terdaftar di DB
    if (type === 'register') {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: identifier },
            ...(targetEmail ? [{ email: targetEmail }] : []),
          ],
        },
      });
      if (existingUser) {
        throw new Error('Email atau nomor telepon sudah terdaftar');
      }
    }

    // Memvalidasi: Jika lupa password, pastikan nomor telepon/email sudah terdaftar di DB
    if (type === 'forgot_password') {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: identifier },
            { email: identifier },
          ],
        },
      });
      if (!existingUser) {
        throw new Error('Email atau nomor akun tidak terdaftar');
      }
      if (!targetEmail && existingUser.email) {
        targetEmail = existingUser.email;
      }
    }

    if (!targetEmail) {
      targetEmail = identifier;
    }

    // Menghapus record OTP lama yang belum diverifikasi pada nomor & jenis yang sama agar menghemat kapasitas DB
    await prisma.otpVerification.deleteMany({
      where: { phone: identifier, type, verified: false },
    });

    // Membuat kode baru dan menetapkan masa aktifnya selama 5 menit
    const code = this.generateOtpCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); 

    // Menyimpan data verifikasi OTP baru ke database
    await prisma.otpVerification.create({
      data: { phone: identifier, code, type, expiresAt },
    });

    try {
      // Mengirimkan kode OTP ke Gmail pengguna
      await sendOtpEmail(targetEmail, code, type);
    } catch (error) {
      console.error('Failed to send OTP via Gmail:', error);
      throw new Error('Gagal mengirim OTP ke Gmail. Silakan coba lagi.');
    }

    return { 
      success: true, 
      message: `Kode OTP berhasil dikirim ke Gmail (${targetEmail})`,
      targetEmail,
    };
  }

  /**
   * Memverifikasi kesesuaian kode OTP yang diinput oleh pengguna.
   */
  async verifyOtp(identifier: string, code: string, type: 'register' | 'forgot_password') {
    if (!identifier || !code) {
      throw new Error('Email/nomor dan kode OTP harus diisi');
    }

    // Mengambil data OTP terakhir yang belum diverifikasi dari DB
    const otp = await prisma.otpVerification.findFirst({
      where: { phone: identifier, type, verified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new Error('Kode OTP tidak ditemukan. Silakan minta kode baru.');
    }

    // Memeriksa apakah kode OTP sudah kedaluwarsa (melewati batas waktu 5 menit)
    if (new Date() > otp.expiresAt) {
      await prisma.otpVerification.delete({ where: { id: otp.id } });
      throw new Error('Kode OTP sudah kadaluarsa. Silakan minta kode baru.');
    }

    // Mencocokan kode OTP yang diinput dengan yang tersimpan di DB
    if (otp.code !== code) {
      throw new Error('Kode OTP salah');
    }

    // Menandai status OTP di DB menjadi 'verified: true' agar tidak bisa digunakan lagi
    await prisma.otpVerification.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    return { success: true, message: 'Kode OTP berhasil diverifikasi' };
  }

  // ========== REGISTER (dengan OTP) ==========

  /**
   * Mendaftarkan akun customer baru ke dalam sistem.
   * Langkah pendaftaran mewajibkan pengguna untuk melakukan verifikasi OTP terlebih dahulu.
   */
  async register(data: any) {
    const { name, email, phone, password } = data;

    if (!name || !phone || !password) {
      throw new Error('Nama, nomor WhatsApp, dan password harus diisi');
    }

    // 1. Memastikan nomor telepon atau email telah memverifikasi OTP registrasi dengan sukses
    const verifiedOtp = await prisma.otpVerification.findFirst({
      where: {
        OR: [
          { phone },
          ...(email ? [{ phone: email }] : []),
        ],
        type: 'register',
        verified: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verifiedOtp) {
      throw new Error('Email atau nomor belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.');
    }

    // 2. Memeriksa duplikasi alamat email atau nomor telepon di database
    const whereClause: any = { OR: [{ phone }] };
    if (email) whereClause.OR.push({ email });

    const existingUser = await prisma.user.findFirst({ where: whereClause });

    if (existingUser) {
      throw new Error('Email atau nomor telepon sudah terdaftar');
    }

    // 3. Mengenkripsi (hash) password menggunakan bcrypt sebelum disimpan demi keamanan data kredensial
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Menyimpan data pengguna baru ke database
    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        phone,
        password: hashedPassword,
        role: 'customer',
      },
    });

    // 5. Membersihkan data verifikasi OTP pendaftaran yang telah selesai digunakan agar DB bersih dan tidak bisa dipakai ulang
    await prisma.otpVerification.deleteMany({
      where: {
        OR: [
          { phone },
          ...(email ? [{ phone: email }] : []),
        ],
        type: 'register',
      },
    });

    // 6. Membuat JWT Token agar pengguna otomatis login setelah berhasil registrasi
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

  /**
   * Mengganti password lama dengan yang baru (reset password) jika pengguna lupa password.
   * Proses ini diamankan dengan memvalidasi kepemilikan nomor WhatsApp melalui verifikasi OTP.
   */
  async forgotPassword(identifier: string, newPassword: string) {
    if (!identifier) {
      throw new Error('Email atau nomor telepon harus diisi');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password baru minimal 6 karakter');
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier },
        ],
      },
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan');
    }

    // 1. Memastikan bahwa kode OTP tipe 'forgot_password' telah diverifikasi sebelumnya
    const verifiedOtp = await prisma.otpVerification.findFirst({
      where: { phone: identifier, type: 'forgot_password', verified: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!verifiedOtp) {
      throw new Error('Akun belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.');
    }

    // 2. Mengenkripsi password baru menggunakan bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 3. Mengupdate password pengguna di database
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 4. Membersihkan log data OTP lupa password untuk nomor tersebut
    await prisma.otpVerification.deleteMany({
      where: { phone: identifier, type: 'forgot_password' },
    });

    return { success: true, message: 'Password berhasil diubah' };
  }
}
