import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Props = {
  title: ReactNode;
  subtitle: ReactNode;
  action?: ReactNode;
  imgSrc?: string;
  imgAlt: string;
  imgFallback?: string;
  imgBgColor?: string;
  isCircleImg?: boolean;
};

const TitleCardHeader = ({
  title,
  subtitle,
  action,
  imgSrc,
  imgAlt,
  imgFallback,
  imgBgColor,
  isCircleImg = false,
}: Props) => {
  if (typeof title === 'string' && !imgFallback) {
    imgFallback = title[0];
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar
        className={cn(
          'shrink-0 size-10',
          imgBgColor ? `bg-[${imgBgColor}]` : 'bg-transparent',
          isCircleImg ? 'rounded-full' : 'rounded-lg',
        )}
      >
        <AvatarImage src={imgSrc} alt={imgAlt} />
        <AvatarFallback>{imgFallback}</AvatarFallback>
      </Avatar>

      <div className="grow">
        <div className="text-base font-bold">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default TitleCardHeader;
