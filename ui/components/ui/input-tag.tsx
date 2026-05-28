// input-tags.tsx

'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Input } from './input';
import type { ComponentProps } from 'react';

type InputProps = ComponentProps<typeof Input>;

type InputTagsProps = Omit<InputProps, 'value' | 'onChange'> & {
  value: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
};

const InputTags = React.forwardRef<HTMLInputElement, InputTagsProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [pendingDataPoint, setPendingDataPoint] = React.useState('');

    React.useEffect(() => {
      if (pendingDataPoint === ',') {
        return;
      }
      if (pendingDataPoint.includes(',')) {
        const newDataPoints = new Set([
          ...value,
          ...pendingDataPoint
            .split(',')
            .map((chunk) => chunk.trim())
            .filter((chunk) => chunk !== ''),
        ]);
        onChange(Array.from(newDataPoints));
        setPendingDataPoint('');
      }
    }, [pendingDataPoint, onChange, value]);

    const addPendingDataPoint = () => {
      if (pendingDataPoint) {
        const newDataPoints = new Set([...value, pendingDataPoint]);
        onChange(Array.from(newDataPoints));
        setPendingDataPoint('');
      }
    };

    return (
      <div
        className={cn(
          'min-h-9 flex w-full flex-wrap gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 md:text-sm',
          'has-focus-visible:border-ring has-focus-visible:ring-ring/50 has-focus-visible:ring-[3px]',
          'has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive',
          className,
        )}
      >
        {value.map((item) => (
          <Badge key={item} variant="secondary">
            {item}
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 h-3 w-3"
              onClick={() => {
                onChange(value.filter((i) => i !== item));
              }}
            >
              <XIcon className="w-3" />
            </Button>
          </Badge>
        ))}
        <input
          className="flex-1 outline-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground"
          value={pendingDataPoint}
          onChange={(e) => setPendingDataPoint(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addPendingDataPoint();
            } else if (
              e.key === 'Backspace' &&
              pendingDataPoint.length === 0 &&
              value.length > 0
            ) {
              e.preventDefault();
              onChange(value.slice(0, -1));
            }
          }}
          {...props}
          ref={ref}
        />
      </div>
    );
  },
);

InputTags.displayName = 'InputTags';

export { InputTags };
