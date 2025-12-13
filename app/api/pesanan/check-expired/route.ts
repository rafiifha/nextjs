import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';

// Endpoint to check and cancel expired orders
// This should be called periodically (e.g., via cron job or scheduled task)
export async function POST(request: NextRequest) {
  try {
    const now = new Date();
    
    // Find all pending orders that have expired
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'pending',
        expiredAt: {
          lte: now, // expiredAt <= now
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log(`⏰ Found ${expiredOrders.length} expired orders`);

    // Cancel all expired orders
    for (const order of expiredOrders) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'expired' },
      });

      console.log(`❌ Order ${order.id} expired and cancelled`);
      
      // Trigger Pusher event
      try {
        await triggerOrderEvent('order-updated', {
          ...order,
          status: 'expired',
        });
      } catch (error) {
        console.error('Pusher error:', error);
      }
    }

    return NextResponse.json({
      message: `Cancelled ${expiredOrders.length} expired orders`,
      expiredOrders: expiredOrders.map(o => o.id),
    });
  } catch (error: any) {
    console.error('❌ Check expired orders error:', error);
    return NextResponse.json(
      { error: 'Gagal memproses expired orders', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// GET endpoint for manual check (for testing)
export async function GET() {
  try {
    const now = new Date();
    
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'pending',
        expiredAt: {
          lte: now,
        },
      },
      select: {
        id: true,
        customerName: true,
        totalHarga: true,
        expiredAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      expiredCount: expiredOrders.length,
      expiredOrders,
    });
  } catch (error: any) {
    console.error('❌ Get expired orders error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil expired orders' },
      { status: 500 }
    );
  }
}

