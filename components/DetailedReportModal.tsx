import React from 'react';
import { X, FileText, Download, Filter, BarChart2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ChartDataPoint } from '../types';
import { SalesChart } from './SalesChart';

interface DetailedReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ChartDataPoint[];
  totalSales: number;
  avgTicket: number;
  isDarkMode?: boolean;
}

export const DetailedReportModal: React.FC<DetailedReportModalProps> = ({ isOpen, onClose, data, totalSales, avgTicket, isDarkMode = false }) => {
  if (!isOpen) return null;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-fade-in-up border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-800 dark:text-white">Relatório de Vendas</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Análise detalhada do período</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter size={16} /> Últimos 7 dias
            </Button>
             <Button variant="outline" size="sm" className="flex items-center gap-2">
              <BarChart2 size={16} /> Categorias
            </Button>
          </div>
          <Button variant="secondary" size="sm" className="flex items-center gap-2">
            <Download size={16} /> Exportar PDF
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-black/20 space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card className="p-4 bg-white dark:bg-zinc-800">
               <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Faturamento Total</p>
               <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{formatCurrency(totalSales)}</h3>
               <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                 <span className="font-bold">+12%</span> em relação à semana anterior
               </p>
             </Card>
             <Card className="p-4 bg-white dark:bg-zinc-800">
               <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Ticket Médio</p>
               <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{formatCurrency(avgTicket)}</h3>
               <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">Média por venda realizada</p>
             </Card>
             <Card className="p-4 bg-white dark:bg-zinc-800">
               <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Itens Vendidos</p>
               <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">45</h3>
               <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                 <span className="font-bold">+5%</span> volume de saída
               </p>
             </Card>
          </div>

          {/* Large Chart */}
          <Card title="Evolução de Vendas" className="bg-white dark:bg-zinc-800">
            <div className="h-[300px]">
              <SalesChart data={data} isDarkMode={isDarkMode} />
            </div>
          </Card>

          {/* Breakdown Table (Mock) */}
           <Card title="Desempenho por Categoria" className="bg-white dark:bg-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 uppercase text-xs font-medium">
                  <tr>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3 text-center">Qtd. Vendida</th>
                    <th className="px-4 py-3 text-right">Faturamento</th>
                    <th className="px-4 py-3 text-right">% Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                   <tr>
                     <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">Camisetas</td>
                     <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">24</td>
                     <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">R$ 1.197,60</td>
                     <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">35%</td>
                   </tr>
                   <tr>
                     <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">Jeans</td>
                     <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">12</td>
                     <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">R$ 1.558,80</td>
                     <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">45%</td>
                   </tr>
                   <tr>
                     <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">Vestidos</td>
                     <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">9</td>
                     <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">R$ 1.705,50</td>
                     <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">20%</td>
                   </tr>
                </tbody>
              </table>
            </div>
           </Card>

        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
           <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
};