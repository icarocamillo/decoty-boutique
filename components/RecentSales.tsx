import React, { useState, useMemo } from 'react';
import { Sale } from '../types';
import { ShoppingBag, User, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, Calendar, Clock, Package, DollarSign, Check } from 'lucide-react';
import { SaleDetailsModal } from './SaleDetailsModal';
import { Badge } from './ui/Badge';
import { formatDateStandard } from '../utils';
import { useNavigate } from 'react-router-dom';

interface RecentSalesProps {
  sales: Sale[];
  onUpdate?: () => void;
}

type SortKey = 'id' | 'cliente_nome' | 'produtos_resumo' | 'data_venda' | 'item_count' | 'valor_total' | 'status_pagamento';

export const RecentSales: React.FC<RecentSalesProps> = ({ sales, onUpdate }) => {
  const navigate = useNavigate();
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
      let aValue: any = a[sortConfig.key as keyof Sale];
      let bValue: any = b[sortConfig.key as keyof Sale];

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
      {/* MOBILE VIEW: Card List */}
      <div className="flex flex-col gap-3 sm:hidden px-1">
        {sortedSales.map((sale) => {
          const { weekDay, dateTime } = formatDateStandard(sale.data_venda);
          const isCancelled = sale.status === 'cancelled';
          const displayedItemCount = sale.items 
            ? sale.items.filter(i => i.status === 'sold').reduce((acc, item) => acc + item.quantidade, 0) 
            : (sale.item_count || 0);
          const currentTotal = calculateCurrentTotal(sale);

          return (
            <button 
              key={sale.id} 
              onClick={() => setSelectedSale(sale)}
              className={`text-left p-4 rounded-xl border bg-white dark:bg-zinc-900 shadow-sm active:scale-[0.98] transition-all flex flex-col gap-3 ${
                isCancelled ? 'border-red-100 dark:border-red-900/30' : 'border-zinc-100 dark:border-zinc-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col min-w-0 flex-1 pr-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Venda #{cleanId(sale)}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <User size={14} className="text-emerald-600 shrink-0" />
                    <span 
                      onClick={(e) => {
                        if (sale.cliente_id) {
                          e.stopPropagation();
                          navigate(`/clients/${sale.cliente_id}/history`);
                        }
                      }}
                      className={`font-bold text-zinc-900 dark:text-zinc-100 truncate ${sale.cliente_id ? 'hover:text-blue-600 hover:underline cursor-pointer' : ''}`}
                    >
                      {sale.cliente_nome || 'Consumidor'}
                    </span>
                  </div>
                  {/* MOBILE: Resumo de Produtos */}
                  <div className="mt-2 flex items-start gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
                    <Package size={12} className="text-zinc-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {sale.produtos_resumo || 'Nenhum item registrado'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {isCancelled ? (
                    <Badge variant="destructive" className="text-[10px]">Cancelada</Badge>
                  ) : (
                    <>
                      <Badge variant="success" className="text-[10px]">Concluída</Badge>
                      {sale.status_pagamento === 'pago' ? (
                        <Badge variant="success" className="text-[8px] px-1.5 h-4 gap-1"><Check size={8} /> Pago</Badge>
                      ) : (
                        <Badge variant="warning" className="text-[8px] px-1.5 h-4 gap-1"><DollarSign size={8} /> Pendente</Badge>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-zinc-500 dark:text-zinc-400 border-y border-zinc-50 dark:border-zinc-800 py-2">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>{weekDay.split('-')[0]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{dateTime.split(' às ')[1]}</span>
                </div>
                <div className="flex items-center gap-1 ml-auto font-medium">
                  <ShoppingBag size={12} />
                  <span>{displayedItemCount} {displayedItemCount === 1 ? 'item' : 'itens'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className={`text-lg font-black ${isCancelled ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-white'}`}>
                  {formatCurrency(currentTotal)}
                </span>
                <ChevronRight size={16} className="text-zinc-300" />
              </div>
            </button>
          );
        })}
      </div>

      {/* DESKTOP VIEW: Standard Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('id')}>
                <div className="flex items-center">ID <SortIcon columnKey="id" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('data_venda')}>
                <div className="flex items-center">Data <SortIcon columnKey="data_venda" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('cliente_nome')}>
                <div className="flex items-center">Cliente <SortIcon columnKey="cliente_nome" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('produtos_resumo')}>
                <div className="flex items-center">Produtos <SortIcon columnKey="produtos_resumo" /></div>
              </th>
              <th className="px-4 py-3 font-medium text-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('item_count')}>
                 <div className="flex items-center justify-center">Itens <SortIcon columnKey="item_count" /></div>
              </th>
              <th className="px-4 py-3 font-medium text-center">Status</th>
              <th className="px-4 py-3 font-medium text-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('status_pagamento')}>
                 <div className="flex items-center justify-center">Pagamento <SortIcon columnKey="status_pagamento" /></div>
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
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    <div className="flex flex-col text-xs">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{weekDay}</span>
                      <span className="text-zinc-500 dark:text-zinc-500">{dateTime}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 ${isCancelled ? 'opacity-60 text-zinc-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    <div className="flex items-center gap-2 group/client">
                      <User size={14} className="text-zinc-400 group-hover/client:text-emerald-600 transition-colors" />
                      <span 
                        onClick={(e) => {
                          if (sale.cliente_id) {
                            e.stopPropagation();
                            navigate(`/clients/${sale.cliente_id}/history`);
                          }
                        }}
                        className={`truncate max-w-[120px] font-bold transition-colors ${sale.cliente_id ? 'hover:text-blue-600 hover:underline cursor-pointer' : ''}`} 
                        title={sale.cliente_nome}
                      >
                        {sale.cliente_nome || 'Não informado'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2 max-w-[200px] overflow-hidden">
                      <Package size={14} className="text-zinc-300 shrink-0" />
                      <span className="truncate text-xs" title={sale.produtos_resumo}>
                        {sale.produtos_resumo || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isCancelled ? 'bg-zinc-50 text-zinc-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                      <ShoppingBag size={12} />
                      {displayedItemCount}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                     {isCancelled ? <Badge variant="destructive" className="scale-90">Cancelada</Badge> : <Badge variant="success" className="scale-90">Concluída</Badge>}
                  </td>
                  <td className="px-4 py-3 text-center">
                     {!isCancelled && (
                         sale.status_pagamento === 'pago' 
                          ? <Badge variant="success" className="text-[9px] h-5 gap-1 px-2"><Check size={10} /> Pago</Badge> 
                          : <Badge variant="warning" className="text-[9px] h-5 gap-1 px-2"><DollarSign size={10} /> Pendente</Badge>
                     )}
                     {isCancelled && <span className="text-zinc-300 dark:text-zinc-700">-</span>}
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