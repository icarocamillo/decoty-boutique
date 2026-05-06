import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (items: number) => void;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  startIndex,
  endIndex,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
      
      {/* Informação de Contagem */}
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        Mostrando <span className="font-medium text-zinc-900 dark:text-white">{Math.min(startIndex + 1, totalItems)}</span> até{' '}
        <span className="font-medium text-zinc-900 dark:text-white">{Math.min(endIndex, totalItems)}</span> de{' '}
        <span className="font-medium text-zinc-900 dark:text-white">{totalItems}</span> registros
      </div>

      <div className="flex items-center gap-4">
        {/* Seletor de Itens por Página */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:inline">Exibir</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="h-8 pl-2 pr-6 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Controles de Navegação */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
            title="Página Anterior"
          >
            <ChevronLeft size={16} />
          </Button>
          
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 px-2 min-w-[3rem] text-center">
             {currentPage} / {Math.max(1, totalPages)}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-8 w-8 p-0"
            title="Próxima Página"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};