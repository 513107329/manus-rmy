import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn, handleKeyUpAsClick } from '@/lib/utils';

type Props = {
  top: ReactNode;
  middle: ReactNode;
  bottom: ReactNode;
  className?: string;
  onClick?: () => void;
};

const BaseCard = ({ top, middle, bottom, className, onClick }: Props) => {
  return (
    <Card
      className={cn(
        'w-96 h-48 flex flex-col p-4 hover:shadow-lg transition-shadow hover:border-primary',
        className,
        onClick && 'cursor-pointer',
      )}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyUp={handleKeyUpAsClick}
    >
      <div className="min-h-o shrink-0">{top}</div>
      <div className="min-h-0 grow py-3 text-sm text-muted-foreground line-clamp-5">
        {middle}
      </div>

      <div className="min-h-0 shrink-0">{bottom}</div>
    </Card>
  );
};

export default BaseCard;
