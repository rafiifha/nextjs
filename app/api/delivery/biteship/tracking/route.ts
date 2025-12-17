import { NextRequest, NextResponse } from 'next/server';
import { getTracking } from '@/services/biteshipService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trackingId = searchParams.get('trackingId');

    if (!trackingId) {
      return NextResponse.json(
        { error: 'Tracking ID is required' },
        { status: 400 }
      );
    }

    const tracking = await getTracking(trackingId);
    
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

