// Table Pagination Component

'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { cn } from '../../../shared/utils';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage, isRTL } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions: number[];
  showPageSizeSelector?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions,
  showPageSizeSelector = true,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const labelRows = getT(TRANSLATION_KEYS.PAGINATION_ROWS, language, defaultLang);
  const labelOf = getT(TRANSLATION_KEYS.PAGINATION_OF, language, defaultLang);
  const rtl = isRTL(language ?? defaultLang);

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-white">
      <div className="flex items-center gap-2">
        {showPageSizeSelector && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Rows:</span>
            <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="w-16 h-7 text-xs border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {startItem}-{endItem} {labelOf} {totalItems}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className="h-7 w-7 p-0 hover:bg-violet-50 hover:text-violet-600 disabled:opacity-30"
        >
          {rtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </Button>

        <div className="flex items-center gap-0.5">
          {getPageNumbers().map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-gray-400">
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            return (
              <Button
                key={pageNum}
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'h-7 min-w-7 px-2 text-xs',
                  currentPage === pageNum 
                    ? 'bg-violet-600 text-white hover:bg-violet-700 hover:text-white' 
                    : 'text-gray-600 hover:bg-violet-50 hover:text-violet-600'
                )}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="h-7 w-7 p-0 hover:bg-violet-50 hover:text-violet-600 disabled:opacity-30"
        >
          {rtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

TablePagination.displayName = 'TablePagination';

