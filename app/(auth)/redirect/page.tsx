'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
    
      window.location.href = '/';
    }, 1000);

    return () => clearTimeout(timeout);
  }, [router]);

  return <div className="text-center text-md rounded-xl p-4 bg-white shadow-md  h-full flex items-center justify-center max-w-md mx-auto min-h-[100px]">redirecting...</div>;
}
