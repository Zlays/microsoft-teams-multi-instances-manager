'use client';

import { useEffect, useState } from 'react';
import App from '../App';

export default function HomePage() {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof window === 'undefined') {
    return null;
  }

  return <App />;
}
