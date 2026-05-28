'use client';

import { LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useIntersectionObserver } from 'usehooks-ts';

type Props = {
  onLoadMore: () => void;
};

const LoadMore = ({ onLoadMore }: Props) => {
  const { isIntersecting, ref } = useIntersectionObserver();

  useEffect(() => {
    if (isIntersecting) {
      onLoadMore();
    }
  }, [isIntersecting, onLoadMore]);

  return (
    <div
      ref={ref}
      className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <LoaderCircle className="animate-spin" />
      <p>Loading...</p>
    </div>
  );
};

export default LoadMore;
