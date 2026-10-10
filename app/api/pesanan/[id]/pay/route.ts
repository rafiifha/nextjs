import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';
import { sendReceiptEmail } from '@/services/emailService';

// Endpoint to manually mark order as paid (stock already reserved at order creation)
// Used as fallback when Pakasir callback is not received
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if order is already paid
    if (order.status === 'paid') {
      return NextResponse.json({
        message: 'Order already paid',
        order,
      });
    }

    // Check if order is expired
    if (order.expiredAt && new Date() > order.expiredAt) {
      return NextResponse.json(
        { error: 'Pesanan sudah kedaluwarsa' },
        { status: 400 }
      );
    }

    // Check if order is cancelled
    if (order.status === 'cancelled' || order.status === 'expired') {
      return NextResponse.json(
        { error: 'Pesanan sudah dibatalkan' },
        { status: 400 }
      );
    }

    // Stok sudah di-reserve saat order dibuat, langsung update status ke paid
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'paid' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log(`✅ Order ${orderId} updated to paid status and stock reduced`);
    
    // Trigger Pusher event
    try {
      await triggerOrderEvent('order-updated', updatedOrder);
    } catch (error) {
      console.error('Pusher error:', error);
    }

    // Kirim invoice/receipt via Gmail secara async agar tidak menghambat response
    (async () => {
      try {
        const customerUser = order.userId
          ? await prisma.user.findUnique({ where: { id: order.userId } })
          : await prisma.user.findFirst({ where: { phone: order.customerPhone } });
        const customerEmail = customerUser?.email || (order.customerPhone.includes('@') ? order.customerPhone : null);

        if (customerEmail) {
          await sendReceiptEmail(customerEmail, {
            orderId: order.id,
            customerName: order.customerName,
            totalHarga: order.totalHarga,
            shippingFee: order.shippingFee,
            status: 'paid',
            items: order.items.map(item => ({
              name: item.product.name,
              quantity: item.quantity,
              price: item.price * item.quantity,
            })),
            createdAt: order.createdAt.toISOString(),
          });
          console.log(`📧 Invoice Gmail berhasil dikirim ke ${customerEmail}`);
        }
      } catch (err) {
        console.error('❌ Gagal kirim Gmail invoice:', err);
      }
    })();

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('❌ Pay order error:', error);
    return NextResponse.json(
      { error: 'Gagal memproses pembayaran', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

