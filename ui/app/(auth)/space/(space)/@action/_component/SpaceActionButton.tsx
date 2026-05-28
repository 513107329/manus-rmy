'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Props = {
  label: string;
  href: string;
};

const SpaceActionButton = ({ label, href }: Props) => {
  return (
    <Link href={href}>
      <Button>{label}</Button>
    </Link>
  );
};

export default SpaceActionButton;
