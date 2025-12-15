import { NextRequest, NextResponse } from 'next/server';
import { createSnapTransaction } from '@/services/midtransService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, grossAmount, customerName, customerPhone, finishRedirectUrl, unfinishRedirectUrl, errorRedirectUrl } = body;

    if (!orderId || !grossAmount || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    // Validate and use provided redirect URLs
    let finalFinishUrl = finishRedirectUrl;
    let finalUnfinishUrl = unfinishRedirectUrl;
    let finalErrorUrl = errorRedirectUrl;
    
    // Get base URL from request headers or environment for fallback
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!baseUrl) {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      
      if (origin) {
        baseUrl = origin;
      } else if (referer) {
        try {
          const url = new URL(referer);
          baseUrl = `${url.protocol}//${url.host}`;
        } catch (e) {
          baseUrl = 'http://localhost:3000';
        }
      } else {
        baseUrl = 'http://localhost:3000';
      }
    }
    
    // Ensure baseUrl doesn't end with slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // Validate URLs - ensure they are full URLs (start with http:// or https://)
    const isValidUrl = (url: string | undefined) => {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };
    
    // Use provided URLs if valid, otherwise construct from baseUrl
    if (!isValidUrl(finalFinishUrl)) {
      finalFinishUrl = `${baseUrl}/payment/success`;
    }
    if (!isValidUrl(finalUnfinishUrl)) {
      finalUnfinishUrl = `${baseUrl}/payment/pending`;
    }
    if (!isValidUrl(finalErrorUrl)) {
      finalErrorUrl = `${baseUrl}/payment/failed`;
    }

    console.log('🔗 Redirect URLs (validated):');
    console.log('  - Base URL:', baseUrl);
    console.log('  - Finish URL:', finalFinishUrl);
    console.log('  - Unfinish URL:', finalUnfinishUrl);
    console.log('  - Error URL:', finalErrorUrl);

    const transaction = await createSnapTransaction({
      orderId: `ORDER-${orderId}-${Date.now()}`,
      grossAmount,
      customerDetails: {
        first_name: customerName,
        phone: customerPhone,
      },
      finishRedirectUrl: finalFinishUrl,
      unfinishRedirectUrl: finalUnfinishUrl,
      errorRedirectUrl: finalErrorUrl,
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

