import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  className?: string;
  icon: ReactNode;
  children: ReactNode;
};

const TitleHeader = ({ title, className, icon, children }: Props) => {
  return (
    <header
      className={cn('flex items-center justify-between px-3 py-3', className)}
    >
      <div className="flex gap-2 items-center">
        <div className="p-2 bg-primary text-accent rounded-full">{icon}</div>
        <h1 className="text-xl font-medium">{title}</h1>
      </div>
      {children}
    </header>
  );
};

export default TitleHeader;
