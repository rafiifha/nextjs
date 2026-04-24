import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { sendWhatsAppMessage } from '@/services/whatsappService';

export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { error: 'Email atau nomor WhatsApp harus diisi' },
        { status: 400 }
      );
    }

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ]
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      );
    }

    // Generate random 6 character password
    const newPassword = Math.random().toString(36).slice(-6).toUpperCase();

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // If user has phone, try to send WhatsApp
    if (user.phone) {
      try {
        const message = `🔑 *Reset Password - Toko Naning*\n\nHalo ${user.name},\nPassword Anda telah direset. Berikut adalah password baru Anda:\n\n*${newPassword}*\n\nSilakan login menggunakan password baru ini dan segera ubah password Anda di halaman Profil demi keamanan.\n\nTerima kasih.`;
        await sendWhatsAppMessage(user.phone, message);
      } catch (waError) {
        console.error('Failed to send WA message for reset password:', waError);
        // We still return success but maybe Fonnte is not configured
      }
    }

    return NextResponse.json({ success: true, message: 'Password berhasil direset' });
  } catch (error: any) {
    console.error('Lupa password error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
