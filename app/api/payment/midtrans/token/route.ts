import { NextRequest, NextResponse } from 'next/server';
import { createSnapTransaction } from '@/services/midtransService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, grossAmount, customerName, customerPhone } = body;

    if (!orderId || !grossAmount || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    // Get base URL from request headers
    const origin = request.headers.get('origin') || request.headers.get('referer') || 'http://localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin.split('/').slice(0, 3).join('/');

    const transaction = await createSnapTransaction({
      orderId: `ORDER-${orderId}-${Date.now()}`,
      grossAmount,
      customerDetails: {
        first_name: customerName,
        phone: customerPhone,
      },
      finishRedirectUrl: `${baseUrl}/payment/success`,
      unfinishRedirectUrl: `${baseUrl}/payment/pending`,
      errorRedirectUrl: `${baseUrl}/payment/failed`,
    });

    return NextResponse.json({ token: transaction.token });
  } catch (error) {
    console.error('Midtrans token error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat payment token' },
      { status: 500 }
    );
  }
}

