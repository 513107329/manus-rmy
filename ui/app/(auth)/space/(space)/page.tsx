'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const SpaceIndexPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/space/apps');
  }, [router]);

  return null;
};

export default SpaceIndexPage;
