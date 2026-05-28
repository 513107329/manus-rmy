import type { ComponentProps, MouseEventHandler } from 'react';
import { Input } from '@/components/ui/input';
import type { IconType } from '@/lib/types';
import { cn, handleKeyUpAsClick } from '@/lib/utils';

type Props = ComponentProps<typeof Input> & {
  containerClassName?: string;
  leftIcon?: IconType;
  rightIcon?: IconType;
  iconSize?: number;
  onLeftIconClick?: () => void;
  onRightIconClick?: () => void;
  onRightIconMouseDown?: MouseEventHandler<HTMLButtonElement>;
};

const IconInput = ({
  containerClassName,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  iconSize = 16,
  style,
  onLeftIconClick,
  onRightIconClick,
  onRightIconMouseDown,
  ...props
}: Props) => {
  const iconSizeRem = iconSize / 16;

  return (
    <div className={cn('relative w-full', containerClassName)}>
      {LeftIcon && (
        <button
          type="button"
          className={cn(
            'absolute px-3 left-0 top-1/2 -translate-y-1/2 h-full flex items-center justify-center',
            onLeftIconClick && 'cursor-pointer',
          )}
          onClick={onLeftIconClick}
          onKeyUp={handleKeyUpAsClick}
        >
          <LeftIcon size={iconSize} />
        </button>
      )}
      <Input
        {...props}
        style={{
          ...style,
          paddingLeft: LeftIcon ? `${0.75 + iconSizeRem + 0.75}rem` : '0.75rem',
          paddingRight: RightIcon
            ? `${0.75 + iconSizeRem + 0.75}rem`
            : '0.75rem',
        }}
      />
      {RightIcon && (
        <button
          type="button"
          className={cn(
            'absolute right-0 px-3 top-1/2 -translate-y-1/2 flex items-center justify-center',
            onRightIconClick && 'cursor-pointer',
          )}
          onClick={onRightIconClick}
          onMouseDown={onRightIconMouseDown}
          onKeyUp={handleKeyUpAsClick}
        >
          <RightIcon size={iconSize} />
        </button>
      )}
    </div>
  );
};

export default IconInput;
