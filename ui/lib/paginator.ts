import { createLoader, parseAsInteger, parseAsString } from 'nuqs';

export const loadPageReqParams = createLoader({
  currentPage: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(10),
});

export const loadSearchPageReqParams = createLoader({
  currentPage: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(10),
  searchWord: parseAsString.withDefault(''),
});
