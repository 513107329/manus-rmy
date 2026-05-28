'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  children: ReactNode;
  title: string;
};

const InterceptingModal = ({ children, title }: Props) => {
  const router = useRouter();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      router.back();
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="min-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <VisuallyHidden asChild>
            <DialogDescription>Intercepting modal</DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default InterceptingModal;
