import { NextRequest, NextResponse } from 'next/server';
import { getTracking } from '@/services/biteshipService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tracking = await getTracking(params.id);
    
    if (tracking.success) {
      return NextResponse.json(tracking);
    } else {
      return NextResponse.json(
        { error: tracking.message || 'Gagal mengambil data tracking' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Biteship tracking error:', error);
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Gagal mengambil data tracking';
    return NextResponse.json(
      { error: errorMessage },
      { status: error.response?.status || 500 }
    );
  }
}

