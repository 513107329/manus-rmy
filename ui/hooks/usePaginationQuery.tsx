import type { PaginationResult } from '@repo/common';
import { useInfiniteQuery } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect } from 'react';
import { toast } from 'sonner';
import LoadMoreComponent from '@/components/LoadMore';

type FetchFnParams = {
  currentPage: number;
  searchWord: string;
};

type Props<T> = {
  fetchFn: (params: FetchFnParams) => Promise<PaginationResult<T>>;
  queryKey: string;
};

const usePaginationQuery = <T,>({ fetchFn, queryKey }: Props<T>) => {
  const [searchKeyword] = useQueryState(
    'keywords',
    parseAsString.withDefault(''),
  );

  const { data, error, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: [queryKey, searchKeyword],
    queryFn: ({ pageParam }) =>
      fetchFn({ currentPage: pageParam, searchWord: searchKeyword }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.paginator.totalPage === 0) {
        return undefined;
      }
      return lastPage.paginator.currentPage >= lastPage.paginator.totalPage
        ? undefined
        : lastPage.paginator.currentPage + 1;
    },
  });

  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to fetch data');
    }
  }, [error]);

  const list = data?.pages.flatMap((page) => page.list) ?? [];
  const LoadMore = hasNextPage && list.length > 0 && (
    <LoadMoreComponent onLoadMore={fetchNextPage} />
  );

  return {
    list,
    error,
    LoadMore,
  };
};

export default usePaginationQuery;
