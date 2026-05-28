'use client';

import useBuiltinToolsFilter from '@/hooks/useBuiltinToolsFilter';
import FilterHeader from '../../../_components/FilterHeader';

type Category = {
  name: string;
  category: string;
};

type Props = {
  categories: Category[];
};

const BuiltinToolsFilter = ({ categories }: Props) => {
  const {
    activeCategory,
    searchKeywords,
    setActiveCategory,
    setSearchKeywords,
  } = useBuiltinToolsFilter();

  const keywords = categories.map((item) => ({
    label: item.name,
    value: item.category,
  }));

  keywords.unshift({ label: 'All', value: '' });

  const handleKeywordClick = ({ value }: { value: string }) => {
    setActiveCategory(value);
  };

  const handleSearchConfirm = (value: string) => {
    setSearchKeywords(value);
  };

  return (
    <FilterHeader
      keywords={keywords}
      placeholder="Enter tool name"
      activeKeyword={activeCategory}
      defaultSearchValue={searchKeywords}
      onKeywordClick={handleKeywordClick}
      onSearchConfirm={handleSearchConfirm}
    />
  );
};

export default BuiltinToolsFilter;
