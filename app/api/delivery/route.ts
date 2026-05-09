import { DeliveryController } from '@/app/controllers/DeliveryController';

const deliveryController = new DeliveryController();

export async function GET() {
  return deliveryController.getDeliveryOrders();
}
