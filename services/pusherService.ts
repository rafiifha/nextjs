import Pusher from 'pusher';
import { env } from '@/lib/env';

export const pusher = new Pusher({
  appId: env.PUSHER_APP_ID,
  key: env.PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  cluster: env.PUSHER_CLUSTER,
  useTLS: true,
});

export async function triggerOrderEvent(event: 'order-created' | 'order-updated', data: any) {
  try {
    await pusher.trigger('orders', event, data);
  } catch (error) {
    console.error('Pusher error:', error);
    throw error;
  }
}

