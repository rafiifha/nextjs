export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  MIDTRANS_MERCHANT_ID: process.env.MIDTRANS_MERCHANT_ID!,
  MIDTRANS_CLIENT_KEY: process.env.MIDTRANS_CLIENT_KEY!,
  MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY!,
  BITESHIP_API_KEY: process.env.BITESHIP_API_KEY!,
  PUSHER_APP_ID: process.env.PUSHER_APP_ID!,
  PUSHER_KEY: process.env.PUSHER_KEY!,
  PUSHER_SECRET: process.env.PUSHER_SECRET!,
  PUSHER_CLUSTER: process.env.PUSHER_CLUSTER!,
  FONNTE_API_KEY: process.env.FONNTE_API_KEY!,
  FONNTE_API_URL: process.env.FONNTE_API_URL || 'https://api.fonnte.com',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
};

