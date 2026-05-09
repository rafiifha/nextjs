import { NextRequest } from 'next/server';
import { CashierController } from '@/app/controllers/CashierController';

const cashierController = new CashierController();

// API khusus untuk transaksi kasir (offline)
export async function POST(request: NextRequest) {
  return cashierController.createOfflineOrder(request);
}


