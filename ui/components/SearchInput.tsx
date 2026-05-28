import { Search, X } from 'lucide-react';
import {
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEventHandler,
  useRef,
} from 'react';
import IconInput from '@/components/IconInput';

type Props = {
  className?: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm?: (value: string) => void;
};

const SearchInput = ({
  className,
  placeholder = '',
  defaultValue = '',
  onConfirm,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      onConfirm?.('');
    }
  };

  const handleKeyUp: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  const handleBlur: FocusEventHandler<HTMLInputElement> = (e) => {
    onConfirm?.(e.target.value);
  };

  const handleClearMouseDown: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
  };

  return (
    <IconInput
      containerClassName="w-fit"
      className={className}
      ref={inputRef}
      leftIcon={Search}
      rightIcon={X}
      placeholder={placeholder}
      defaultValue={defaultValue}
      onRightIconMouseDown={handleClearMouseDown}
      onRightIconClick={handleClear}
      onBlur={handleBlur}
      onKeyUp={handleKeyUp}
    />
  );
};

export default SearchInput;
