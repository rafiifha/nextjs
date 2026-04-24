import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, password } = body;

    if (!password || (!email && !phone)) {
      return NextResponse.json(
        { error: 'Email/Phone dan password harus diisi' },
        { status: 400 }
      );
    }

    // Build where clause properly
    const whereClause: any = {
      OR: [],
    };
    
    if (email) {
      whereClause.OR.push({ email });
    }
    if (phone) {
      whereClause.OR.push({ phone });
    }
    
    // If no email or phone, return error
    if (whereClause.OR.length === 0) {
      return NextResponse.json(
        { error: 'Email atau nomor whatsapp harus diisi' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: whereClause,
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Email/Phone atau password salah' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email/Phone atau password salah' },
        { status: 401 }
      );
    }

    const token = generateToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
    });

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: 'Login berhasil',
      token,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Handle database connection errors
    if (error.message?.includes("Can't reach database server") || 
        error.message?.includes("P1001") ||
        error.code === 'P1001') {
      return NextResponse.json(
        { 
          error: 'Tidak dapat terhubung ke database. Silakan coba lagi nanti atau hubungi administrator.',
        },
        { status: 503 }
      );
    }
    
    // Handle other Prisma errors
    if (error.code?.startsWith('P')) {
      return NextResponse.json(
        { 
          error: 'Terjadi kesalahan pada database. Silakan coba lagi.',
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Terjadi kesalahan saat login',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

