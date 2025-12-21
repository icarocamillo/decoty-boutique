
import React, { useState, useMemo } from 'react';
import { Sale } from '../types';
import { ShoppingBag, User, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SaleDetailsModal } from './SaleDetailsModal';
import { Badge } from './ui/Badge';
import { formatDateStandard } from '../utils';

interface RecentSalesProps {
  sales: Sale[];
  onUpdate?: () => void;
}

type SortKey = 'id' | 'cliente_nome' | 'produtos_resumo' | 'data_venda' | 'item_count' | 'valor_total';

export const RecentSales: React.FC<RecentSalesProps> = ({ sales, onUpdate }) => {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'data_venda', direction: 'desc' });

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const cleanId = (sale: Sale) => {
    if (sale.ui_id) return `${sale.ui_id}`;
    return sale.id.includes('-') ? `${sale.id.slice(0, 8)}` : sale.id.replace(/^s/, '');
  };

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const calculateCurrentTotal = (sale: Sale) => {
    if (sale.status === 'cancelled') return 0;
    const soldItemsSubtotal = sale.items?.filter(i => i.status === 'sold').reduce((acc, i) => acc + i.subtotal, 0) || 0;
    if (soldItemsSubtotal === 0) return 0;
    return Math.max(0, soldItemsSubtotal - (sale.desconto_extra || 0) - (sale.uso_vale_presente || 0));
  };

  const sortedSales = useMemo(() => {
    if (!sortConfig) return sales;
    
    const sorted = [...sales].sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      if (sortConfig.key === 'item_count') {
         aValue = a.items?.reduce((acc, item) => acc + item.quantidade, 0) ?? a.item_count ?? 0;
         bValue = b.items?.reduce((acc, item) => acc + item.quantidade, 0) ?? b.item_count ?? 0;
      }

      if (sortConfig.key === 'valor_total') {
         aValue = calculateCurrentTotal(a);
         bValue = calculateCurrentTotal(b);
      }

      if (aValue === undefined || bValue === undefined) return 0;

      if (sortConfig.key === 'id') {
        const numA = a.ui_id || 0;
        const numB = b.ui_id || 0;
        if (numA !== numB) return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        return sortConfig.direction === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
      }

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [sales, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
    }
    return <ArrowUpDown size={14} className="ml-1 opacity-30" />;
  };

  if (sales.length === 0) {
    return (
      <div className="text-center py-10 text-zinc-500 dark:text-zinc-400">
        Nenhuma venda registrada recentemente.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('id')}>
                <div className="flex items-center">ID <SortIcon columnKey="id" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('cliente_nome')}>
                <div className="flex items-center">Cliente <SortIcon columnKey="cliente_nome" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('data_venda')}>
                <div className="flex items-center">Data <SortIcon columnKey="data_venda" /></div>
              </th>
              <th className="px-4 py-3 font-medium text-center">Status</th>
              <th className="px-4 py-3 font-medium text-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('item_count')}>
                 <div className="flex items-center justify-center">Itens <SortIcon columnKey="item_count" /></div>
              </th>
              <th className="px-4 py-3 font-medium text-right cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('valor_total')}>
                <div className="flex items-center justify-end">Total <SortIcon columnKey="valor_total" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedSales.map((sale) => {
              const { weekDay, dateTime } = formatDateStandard(sale.data_venda);
              const isCancelled = sale.status === 'cancelled';
              const displayedItemCount = sale.items 
                ? sale.items.filter(i => i.status === 'sold').reduce((acc, item) => acc + item.quantidade, 0) 
                : (sale.item_count || 0);
              const currentTotal = calculateCurrentTotal(sale);

              return (
                <tr 
                  key={sale.id} 
                  onClick={() => setSelectedSale(sale)}
                  className={`cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${isCancelled ? 'bg-red-50/20 dark:bg-red-900/10' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                    {cleanId(sale)}
                  </td>
                  <td className={`px-4 py-3 text-zinc-700 dark:text-zinc-300 ${isCancelled ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-zinc-400" />
                      <span className="truncate max-w-[120px] font-bold" title={sale.cliente_nome}>
                        {sale.cliente_nome || 'Não informado'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    <div className="flex flex-col text-xs">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{weekDay}</span>
                      <span className="text-zinc-500 dark:text-zinc-500">{dateTime}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                     {isCancelled ? <Badge variant="destructive" className="scale-90">Cancelada</Badge> : <Badge variant="success" className="scale-90">Concluída</Badge>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isCancelled ? 'bg-zinc-50 text-zinc-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                      <ShoppingBag size={12} />
                      {displayedItemCount}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium text-zinc-900 dark:text-white ${isCancelled ? 'line-through opacity-60' : ''}`}>
                    {formatCurrency(currentTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SaleDetailsModal 
        isOpen={!!selectedSale} 
        onClose={() => setSelectedSale(null)} 
        sale={selectedSale} 
        onSaleCancelled={() => onUpdate && onUpdate()}
      />
    </>
  );
};
