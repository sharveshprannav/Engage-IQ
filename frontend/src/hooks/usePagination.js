import { useState, useMemo } from 'react';

export function usePagination(totalItems = 0, initialPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize) || 1;
  }, [totalItems, pageSize]);

  const nextPage = () => setPage((p) => Math.min(p + 1, totalPages));
  const prevPage = () => setPage((p) => Math.max(p - 1, 1));
  const goToPage = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

  return {
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    goToPage,
  };
}
