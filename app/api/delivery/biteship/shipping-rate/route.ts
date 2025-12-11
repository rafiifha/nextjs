import { NextRequest, NextResponse } from 'next/server';
import { getShippingRates } from '@/services/biteshipService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rates = await getShippingRates(body);
    
    if (rates.success) {
      return NextResponse.json(rates);
    } else {
      return NextResponse.json(
        { error: rates.message || 'Gagal mengambil data ongkir' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Biteship shipping rate error:', error);
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Gagal mengambil data ongkir';
    return NextResponse.json(
      { error: errorMessage },
      { status: error.response?.status || 500 }
    );
  }
}

