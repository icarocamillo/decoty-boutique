import React from 'react';
import { DollarSign, BarChart, TrendingUp, Tag, FileBarChart } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { SalesChart } from './SalesChart';
import { RecentSales } from './RecentSales';
import { ChartDataPoint, Sale } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface DashboardHomeProps {
  totalPeriodSales: number;
  dailyAverage: number;
  todaySales: number;
  topBrand: string;
  chartData: ChartDataPoint[];
  recentSales: Sale[];
  isDarkMode: boolean;
  onOpenReport: () => void;
  onRefresh: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  totalPeriodSales,
  dailyAverage,
  todaySales,
  topBrand,
  chartData,
  recentSales,
  isDarkMode,
  onOpenReport,
  onRefresh
}) => {
  const { userRole } = useAuth();
  const isManager = userRole === 'manager';

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">

        {/* Card 1: Vendas Hoje */}
        <Card className="border-l-4 border-l-emerald-600 dark:border-l-emerald-400">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-200 rounded-full">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Vendas Hoje</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(todaySales)}
              </h3>
            </div>
          </div>
        </Card>

        {/* Card 2: Vendas 7 Dias */}
        <Card className="border-l-4 border-l-blue-600 dark:border-l-blue-400">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 rounded-full">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Vendas (7 dias)</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPeriodSales)}
              </h3>
            </div>
          </div>
        </Card>

        {/* Card 3: Média Diária */}
        <Card className="border-l-4 border-l-purple-600 dark:border-l-purple-400">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-zinc-800 text-purple-600 dark:text-purple-400 rounded-full">
              <BarChart size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Média Diária (7 dias)</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dailyAverage)}
              </h3>
            </div>
          </div>
        </Card>
        
        {/* Card 4: Top Brand */}
        <Card className="border-l-4 border-l-amber-600 dark:border-l-amber-400">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-zinc-800 text-amber-600 dark:text-amber-400 rounded-full">
              <Tag size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Marca Mais Vendida (7 dias)</p>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white truncate max-w-[150px]" title={topBrand}>
                {topBrand}
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Stack */}
      <div className="space-y-6 animate-fade-in-up delay-75">
        {/* Chart Section */}
        <Card 
          title="Desempenho de Vendas" 
          description="Receita diária nos últimos 7 dias" 
          className="h-[400px]"
          action={
            isManager ? (
              <Button variant="primary" size="sm" onClick={onOpenReport} className="flex items-center gap-2">
                <FileBarChart size={16} />
                Relatório de Vendas
              </Button>
            ) : undefined
          }
        >
          <SalesChart data={chartData} isDarkMode={isDarkMode} />
        </Card>

        {/* Recent Sales Section */}
        <Card title="Últimas Vendas" description="Transações mais recentes">
          <RecentSales sales={recentSales} onUpdate={onRefresh} />
        </Card>
      </div>
    </>
  );
};