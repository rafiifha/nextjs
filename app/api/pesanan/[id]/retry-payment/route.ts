import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pakasirService } from '@/services/pakasirService';
import { verifyToken } from '@/lib/auth';

// Endpoint to create a new Pakasir transaction for expired/pending digital payments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'ID pesanan tidak valid' },
        { status: 400 }
      );
    }

    // Verify auth
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userPayload = verifyToken(token);
    if (!userPayload) {
      return NextResponse.json(
        { error: 'Token tidak valid' },
        { status: 401 }
      );
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: { variants: true }
            },
            variant: true,
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

    // Verify ownership (non-admin only sees own orders)
    if (userPayload.role !== 'admin' && order.userId !== userPayload.userId) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke pesanan ini' },
        { status: 403 }
      );
    }

    // Only allow retry for pending or expired orders with digital payment
    if (order.status !== 'pending' && order.status !== 'expired') {
      return NextResponse.json(
        { error: 'Hanya pesanan pending atau expired yang dapat diulang pembayarannya' },
        { status: 400 }
      );
    }

    if (!order.paymentMethod || order.paymentMethod === 'tunai') {
      return NextResponse.json(
        { error: 'Hanya pesanan dengan pembayaran digital yang dapat diulang' },
        { status: 400 }
      );
    }

    // Validate stock availability before creating new transaction
    const stockErrors: string[] = [];
    for (const item of order.items) {
      let variant = item.variant;

      if (!variant) {
        variant = item.product.variants.find(v => v.priceType === item.priceType) || null;
        if (!variant) {
          stockErrors.push(`${item.product.name}: varian "${item.priceType}" tidak ditemukan`);
          continue;
        }
      }

      const availableStock = variant.stockOffline ?? variant.stockOnline ?? 0;
      if (availableStock < item.quantity) {
        stockErrors.push(`${item.product.name} (${variant.priceType}): stok tersedia ${availableStock}, diminta ${item.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json(
        { error: 'Stok tidak mencukupi', details: stockErrors },
        { status: 400 }
      );
    }

    // Try to cancel old Pakasir transaction first (ignore errors)
    try {
      await pakasirService.cancelTransaction({
        order_id: `INV-${order.id}`,
        amount: order.totalHarga,
      });
    } catch (cancelErr) {
      console.log(`ℹ️ Could not cancel old transaction for order ${order.id}:`, cancelErr);
    }

    // Create new Pakasir transaction
    const pakasirRes = await pakasirService.createTransaction(order.paymentMethod, {
      order_id: `INV-${order.id}`,
      amount: order.totalHarga,
    });

    if (!pakasirRes?.payment?.payment_number) {
      return NextResponse.json(
        { error: 'Gagal membuat transaksi pembayaran baru' },
        { status: 502 }
      );
    }

    const { payment_number, fee, total_payment, amount } = pakasirRes.payment;
    const customerFee = (total_payment !== undefined && amount !== undefined) ? (total_payment - amount) : fee;

    // Re-reserve stock for expired orders (stock was returned when order expired)
    if (order.status === 'expired') {
      for (const item of order.items) {
        if (item.variantId) {
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: {
              stockOnline: { decrement: item.quantity },
              stockOffline: { decrement: item.quantity },
            },
          });
          console.log(`📦 Retry: stok re-reserved variant ${item.variantId} dikurangi ${item.quantity}`);
        }
      }
    }

    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 15);

    // Update order with new payment info and reset to pending
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'pending',
        paymentNumber: payment_number,
        paymentFee: customerFee,
        expiredAt: expiredAt,
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    console.log(`✅ Retry payment for order ${orderId}: new payment_number=${payment_number}`);

    return NextResponse.json({
      message: 'Transaksi pembayaran baru berhasil dibuat',
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('❌ Retry payment error:', error);
    return NextResponse.json(
      {
        error: 'Gagal membuat ulang pembayaran',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
