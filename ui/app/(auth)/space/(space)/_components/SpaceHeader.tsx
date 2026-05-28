'use client';

import { usePathname, useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import FilterHeader, { type Keyword } from '../../../_components/FilterHeader';

type Props = {
  className?: string;
};

const keywords: Keyword[] = [
  {
    label: 'AI Apps',
    value: 'apps',
  },
  {
    label: 'Tools',
    value: 'tools',
  },
  {
    label: 'Workflows',
    value: 'workflows',
  },
  {
    label: 'Datasets',
    value: 'datasets',
  },
];

const SpaceHeader = ({ className }: Props) => {
  const pathname = usePathname();
  const router = useRouter();
  const [searchKeywords, setSearchKeywords] = useQueryState(
    'keywords',
    parseAsString.withDefault(''),
  );
  const activeItem = keywords.find((keyword) =>
    pathname.includes(keyword.value),
  );
  const activeKeyword = activeItem?.value;
  const placeholder = `Enter ${activeItem?.label?.toLowerCase()} name`;

  const handleKeywordClick = (keyword: Keyword) => {
    router.push(`/space/${keyword.value}`);
  };

  return (
    <FilterHeader
      className={className}
      keywords={keywords}
      placeholder={placeholder}
      defaultSearchValue={searchKeywords}
      activeKeyword={activeKeyword}
      onKeywordClick={handleKeywordClick}
      onSearchConfirm={setSearchKeywords}
    />
  );
};

export default SpaceHeader;
