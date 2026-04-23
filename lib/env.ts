export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  PAKASIR_API_KEY: process.env.PAKASIR_API_KEY!,
  PAKASIR_PROJECT: process.env.PAKASIR_PROJECT!,
  PUSHER_APP_ID: process.env.PUSHER_APP_ID!,
  PUSHER_KEY: process.env.PUSHER_KEY!,
  PUSHER_SECRET: process.env.PUSHER_SECRET!,
  PUSHER_CLUSTER: process.env.PUSHER_CLUSTER!,
  FONNTE_API_KEY: process.env.FONNTE_API_KEY!,
  FONNTE_API_URL: process.env.FONNTE_API_URL || 'https://api.fonnte.com',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
};

