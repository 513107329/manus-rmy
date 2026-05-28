import { PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  message?: string;
  className?: string;
};

const EmptyResult = ({ message = 'No data', className }: Props) => {
  return (
    <div
      className={cn(
        'w-full h-full flex justify-center items-center bg-background rounded-lg',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-1 text-muted-foreground">
        <PackageOpen className="size-10" />
        <p>{message}</p>
      </div>
    </div>
  );
};

export default EmptyResult;
