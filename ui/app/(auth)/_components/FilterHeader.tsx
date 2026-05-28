'use client';

import SearchInput from '@/components/SearchInput';
import { cn, handleKeyUpAsClick } from '@/lib/utils';

export type Keyword = {
  label: string;
  value: string;
};

type Props = {
  keywords: Keyword[];
  activeKeyword?: string;
  placeholder: string;
  className?: string;
  defaultSearchValue?: string;
  onKeywordClick?: (keyword: Keyword) => void;
  onSearchConfirm?: (value: string) => void;
};

const FilterHeader = ({
  keywords,
  activeKeyword,
  placeholder,
  className,
  defaultSearchValue,
  onKeywordClick,
  onSearchConfirm,
}: Props) => {
  return (
    <div
      className={cn('flex items-center justify-between px-3 py-3', className)}
    >
      <div className="flex gap-1 items-center">
        {keywords.map((keyword) => (
          <button
            type="button"
            key={keyword.value}
            className={cn(
              'px-3.5 py-1.5 text-sm text-foreground rounded-lg cursor-pointer bg-muted border',
              activeKeyword === keyword.value &&
                'text-foreground bg-background border-primary',
            )}
            onClick={() => onKeywordClick?.(keyword)}
            onKeyUp={handleKeyUpAsClick}
          >
            {keyword.label}
          </button>
        ))}
      </div>

      <SearchInput
        className="bg-background"
        placeholder={placeholder}
        defaultValue={defaultSearchValue}
        onConfirm={(value) => {
          onSearchConfirm?.(value);
        }}
      />
    </div>
  );
};

export default FilterHeader;
