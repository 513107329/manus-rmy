import { parseAsString, useQueryState } from 'nuqs';

const useBuiltinToolsFilter = () => {
  const [activeCategory, setActiveCategory] = useQueryState(
    'category',
    parseAsString.withDefault(''),
  );

  const [searchKeywords, setSearchKeywords] = useQueryState(
    'keywords',
    parseAsString.withDefault(''),
  );

  return {
    activeCategory,
    searchKeywords,
    setActiveCategory,
    setSearchKeywords,
  };
};

export default useBuiltinToolsFilter;
