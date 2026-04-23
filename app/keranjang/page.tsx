'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KeranjangPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home since cart is now in drawer
    router.push('/');
  }, [router]);

  return null;
}
