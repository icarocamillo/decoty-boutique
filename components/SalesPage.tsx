
import React, { useState, useEffect, useMemo } from 'react';
import { Sale, ChartDataPoint } from '../types';
import { backendService } from '../services/backendService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { SalesChart } from './SalesChart';
import { Search, Calendar, Filter, Download, ArrowUp, ArrowDown, ArrowUpDown, User, ShoppingBag, Undo2, Check, DollarSign } from 'lucide-react';
import { SaleDetailsModal } from './SaleDetailsModal';
import { Pagination } from './ui/Pagination';
import { Badge } from './ui/Badge';
import { formatDateStandard } from '../utils';

import { useData } from '../contexts/DataContext';

export const SalesPage: React.FC = () => {
  const { salesReport: sales, fetchSalesReport, isRefreshing: loading, refreshData } = useData();
  // Date State - Default to current month
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Sale; direction: 'asc' | 'desc' } | null>({ key: 'data_venda', direction: 'desc' });

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchSalesReport(startDate, endDate);
    setCurrentPage(1); 
  }, [startDate, endDate, fetchSalesReport]);

  // Reset page on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const calculateCurrentTotal = (sale: Sale) => {
    if (sale.status === 'cancelled') return 0;
    const soldItemsSubtotal = sale.items?.filter(i => i.status === 'sold').reduce((acc, i) => acc + i.subtotal, 0) || 0;
    if (soldItemsSubtotal === 0) return 0;
    return Math.max(0, soldItemsSubtotal - (sale.desconto_extra || 0) - (sale.uso_vale_presente || 0));
  };

  // Derived Calculations
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // Filter by search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(s => 
        (s.cliente_nome?.toLowerCase() || '').includes(lowerTerm) ||
        (s.id.toLowerCase().includes(lowerTerm)) ||
        (s.ui_id?.toString().includes(lowerTerm)) ||
        (s.produtos_resumo?.toLowerCase() || '').includes(lowerTerm)
      );
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any = a[sortConfig.key];
        let bVal: any = b[sortConfig.key];

        if (sortConfig.key === 'item_count') {
           aVal = a.items?.filter(i => i.status === 'sold').reduce((acc, item) => acc + item.quantidade, 0) ?? a.item_count ?? 0;
           bVal = b.items?.filter(i => i.status === 'sold').reduce((acc, item) => acc + item.quantidade, 0) ?? b.item_count ?? 0;
        }

        if (sortConfig.key === 'valor_total') {
            aVal = calculateCurrentTotal(a);
            bVal = calculateCurrentTotal(b);
        }
        
        if (aVal === undefined || bVal === undefined) return 0;
        
        if (sortConfig.key === 'id') {
          const numA = a.ui_id ?? parseInt((a.id as string).replace(/\D/g, ''), 10);
          const numB = b.ui_id ?? parseInt((b.id as string).replace(/\D/g, ''), 10);
          
          if (!isNaN(numA) && !isNaN(numB)) {
             return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
          }
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [sales, searchTerm, sortConfig]);

  const kpiData = useMemo(() => {
    let totalRevenue = 0;
    let validSalesCount = 0;
    const salesByDayMap: Record<string, number> = {};

    filteredSales.forEach(sale => {
       const saleNetValue = calculateCurrentTotal(sale);
       
       if (saleNetValue > 0) {
           totalRevenue += saleNetValue;
           validSalesCount++;
           
           const date = new Date(sale.data_venda);
           const key = date.toLocaleDateString('pt-BR');
           salesByDayMap[key] = (salesByDayMap[key] || 0) + saleNetValue;
       }
    });

    return { totalRevenue, validSalesCount, salesByDayMap };
  }, [filteredSales]);

  const totalRevenue = kpiData.totalRevenue;
  const totalCount = kpiData.validSalesCount;
  const averageTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!startDate || !endDate) return [];
    const dataPoints: ChartDataPoint[] = [];
    const current = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);

    while (current <= end) {
      const dateKey = current.toLocaleDateString('pt-BR');
      const displayLabel = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      dataPoints.push({
        dia: displayLabel,
        total: kpiData.salesByDayMap[dateKey] || 0
      });
      current.setDate(current.getDate() + 1);
    }
    return dataPoints;
  }, [kpiData.salesByDayMap, startDate, endDate]);

  const totalItems = filteredSales.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSales = filteredSales.slice(startIndex, endIndex);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const cleanId = (sale: Sale) => {
    if (sale.ui_id) return `#${sale.ui_id}`;
    return sale.id.replace(/^s/, '#');
  };
  
  const handleSort = (key: keyof Sale) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Sale }) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
    }
    return <ArrowUpDown size={14} className="ml-1 opacity-30" />;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Relatório de Vendas</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Gerencie e analise o desempenho do período</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={() => alert('Função Exportar PDF em desenvolvimento')}>
             <Download size={16} className="mr-2" /> Exportar
           </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 bg-white dark:bg-zinc-900">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-auto">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Início</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
              />
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Fim</label>
             <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Buscar</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar por ID, cliente ou produto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
              />
            </div>
          </div>
          
          <Button variant="secondary" onClick={() => { setSearchTerm(''); setStartDate(new Date().toISOString().split('T')[0]); }}>
            <Filter size={16} className="mr-2" /> Limpar
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 border-l-4 border-l-zinc-600 dark:border-l-zinc-400">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Faturamento Total (Válido)</p>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{formatCurrency(totalRevenue)}</h3>
        </Card>
        <Card className="p-5 border-l-4 border-l-green-500">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Vendas Válidas</p>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{totalCount}</h3>
        </Card>
        <Card className="p-5 border-l-4 border-l-purple-500">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Ticket Médio (Válido)</p>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{formatCurrency(averageTicket)}</h3>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card title="Evolução do Período (Líquido)" className="h-[400px]">
          <SalesChart data={chartData} />
        </Card>
      )}

      <Card title="Detalhamento das Vendas" className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Carregando dados...</div>
        ) : (
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-500 dark:text-zinc-400 uppercase font-medium border-b border-zinc-100 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('id')}>
                    <div className="flex items-center">ID <SortIcon columnKey="id" /></div>
                  </th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('cliente_nome')}>
                    <div className="flex items-center">Cliente <SortIcon columnKey="cliente_nome" /></div>
                  </th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('produtos_resumo')}>
                    <div className="flex items-center">Produtos <SortIcon columnKey="produtos_resumo" /></div>
                  </th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('data_venda')}>
                    <div className="flex items-center">Data <SortIcon columnKey="data_venda" /></div>
                  </th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Pagamento</th>
                  <th className="px-4 py-3 font-medium text-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('item_count')}>
                     <div className="flex items-center justify-center">Itens <SortIcon columnKey="item_count" /></div>
                  </th>
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('valor_total')}>
                    <div className="flex items-center justify-end">Total <SortIcon columnKey="valor_total" /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {currentSales.map((sale) => {
                  const { weekDay, dateTime } = formatDateStandard(sale.data_venda);
                  const isCancelled = sale.status === 'cancelled';
                  const isAllReturned = sale.items && sale.items.length > 0 && sale.items.every(i => i.status === 'returned');
                  const soldItems = sale.items?.filter(i => i.status === 'sold') || [];
                  const isActuallyPaid = soldItems.length > 0 && soldItems.every(i => i.status_pagamento === 'pago');
                  
                  const currentTotal = calculateCurrentTotal(sale);
                  return (
                    <tr key={sale.id} onClick={() => setSelectedSale(sale)} className={`cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${isCancelled || isAllReturned ? 'bg-red-50/20 dark:bg-red-900/10' : ''}`}>
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{cleanId(sale)}</td>
                      <td className={`px-4 py-3 text-zinc-700 dark:text-zinc-300 ${isCancelled || isAllReturned ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-zinc-400" />
                          <span className="truncate max-w-[120px] font-bold" title={sale.cliente_nome}>{sale.cliente_nome || 'Não informado'}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-zinc-600 dark:text-zinc-400 ${isCancelled || isAllReturned ? 'line-through opacity-60' : ''}`}>
                         <span className="truncate block max-w-[150px]" title={sale.produtos_resumo}>{sale.produtos_resumo || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        <div className="flex flex-col text-xs">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{weekDay}</span>
                          <span className="text-zinc-500 dark:text-zinc-500">{dateTime}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                         {isCancelled ? (
                            <Badge variant="destructive" className="scale-90">Cancelada</Badge>
                         ) : isAllReturned ? (
                            <Badge variant="warning" className="scale-90 gap-1"><Undo2 size={10} /> Devolvida</Badge>
                         ) : (
                            <Badge variant="success" className="scale-90">Concluída</Badge>
                         )}
                      </td>
                      <td className="px-4 py-3 text-center">
                         {!isCancelled && !isAllReturned && (
                             isActuallyPaid 
                              ? <Badge variant="success" className="text-[9px] h-5 gap-1 px-2"><Check size={10} /> Pago</Badge> 
                              : <Badge variant="warning" className="text-[9px] h-5 gap-1 px-2"><DollarSign size={10} /> Pendente</Badge>
                         )}
                         {(isCancelled || isAllReturned) && <span className="text-zinc-300 dark:text-zinc-700">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isCancelled || isAllReturned ? 'bg-zinc-50 text-zinc-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                          <ShoppingBag size={12} />
                          {sale.items ? sale.items.filter(i => i.status === 'sold').reduce((acc, item) => acc + item.quantidade, 0) : (sale.item_count || 0)}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium text-zinc-900 dark:text-white ${isCancelled || isAllReturned ? 'line-through opacity-60' : ''}`}>
                        {formatCurrency(currentTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalItems > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </Card>

      <SaleDetailsModal 
        isOpen={!!selectedSale} 
        onClose={() => setSelectedSale(null)} 
        sale={selectedSale} 
        onSaleCancelled={() => {
          fetchSalesReport(startDate, endDate);
          refreshData();
        }} 
      />
    </div>
  );
};
