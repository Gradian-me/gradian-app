// Data Display Pagination Component

'use client';

import React, { useCallback, useMemo } from 'react';
import { DataDisplayPaginationProps } from '../types';
import { cn } from '../../shared/utils';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage, isRTL } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export const DataDisplayPagination: React.FC<DataDisplayPaginationProps> = ({
  config,
  pagination,
  onPageChange,
  onPageSizeChange,
  className,
  ...props
}) => {
  const {
    enabled = true,
    pageSizeOptions = [10, 25, 50, 100, 500],
    showPageSizeSelector = true,
    showPageInfo = true,
    showFirstLast = true,
    showPrevNext = true,
    position = 'bottom',
  } = config;

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      onPageChange(page);
    }
  }, [onPageChange, pagination.totalPages]);

  const handlePageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(e.target.value);
    onPageSizeChange(newPageSize);
  }, [onPageSizeChange]);

  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const rtl = isRTL(language ?? defaultLang);
  const labelShowing = getT(TRANSLATION_KEYS.PAGINATION_SHOWING, language, defaultLang);
  const labelTo = getT(TRANSLATION_KEYS.PAGINATION_TO, language, defaultLang);
  const labelOf = getT(TRANSLATION_KEYS.PAGINATION_OF, language, defaultLang);
  const labelResults = getT(TRANSLATION_KEYS.PAGINATION_RESULTS, language, defaultLang);
  const labelShow = getT(TRANSLATION_KEYS.PAGINATION_SHOW, language, defaultLang);
  const labelPerPage = getT(TRANSLATION_KEYS.PAGINATION_PER_PAGE, language, defaultLang);

  const pageNumbers = useMemo(() => {
    const pages = [];
    const current = pagination.currentPage;
    const total = pagination.totalPages;
    
    // Show up to 5 page numbers
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }, [pagination.currentPage, pagination.totalPages]);

  if (!enabled || pagination.totalPages <= 1) {
    return null;
  }

  const paginationClasses = cn(
    'data-display-pagination',
    'flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200',
    className
  );

  return (
    <div className={paginationClasses} {...props}>
      {/* Page Info */}
      {showPageInfo && (
        <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
          <span>
            {labelShowing}{' '}
            <span className="font-medium">
              {Math.min((pagination.currentPage - 1) * pagination.pageSize + 1, pagination.totalItems)}
            </span>{' '}
            {labelTo}{' '}
            <span className="font-medium">
              {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)}
            </span>{' '}
            {labelOf}{' '}
            <span className="font-medium">{pagination.totalItems}</span>{' '}
            {labelResults}
          </span>
        </div>
      )}

      {/* Page Size Selector */}
      {showPageSizeSelector && (
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-sm text-gray-700 dark:text-gray-300">
            {labelShow}
          </label>
          <select
            id="page-size"
            value={pagination.pageSize}
            onChange={handlePageSizeChange}
            className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700 dark:text-gray-300">{labelPerPage}</span>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center space-x-1">
        {/* First Page */}
        {showFirstLast && (
          <button
            onClick={() => handlePageChange(1)}
            disabled={pagination.currentPage === 1}
            className={cn(
              'p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:bg-gray-100 rounded-md transition-colors'
            )}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}

        {/* Previous Page */}
        {showPrevNext && (
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className={cn(
              'p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:bg-gray-100 rounded-md transition-colors'
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {pageNumbers.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                page === pagination.currentPage
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Next Page */}
        {showPrevNext && (
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className={cn(
              'p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:bg-gray-100 rounded-md transition-colors'
            )}
          >
            {rtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}

        {/* Last Page */}
        {showFirstLast && (
          <button
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={pagination.currentPage === pagination.totalPages}
            className={cn(
              'p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:bg-gray-100 rounded-md transition-colors'
            )}
          >
            {rtl ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

DataDisplayPagination.displayName = 'DataDisplayPagination';
