import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '@/types';

interface SalesChartProps {
  data: ChartDataPoint[];
  isDarkMode?: boolean;
}

export const SalesChart: React.FC<SalesChartProps> = ({ data, isDarkMode = false }) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Cores atualizadas para melhor contraste e consistência com o tema do app (Green/Zinc)
  const colors = {
    text: isDarkMode ? '#a1a1aa' : '#71717a', // zinc-400 : zinc-500
    grid: isDarkMode ? '#3f3f46' : '#e4e4e7', // zinc-700 : zinc-200
    tooltipBg: isDarkMode ? '#18181b' : '#fff', // zinc-900 : white
    tooltipBorder: isDarkMode ? '#3f3f46' : '#e4e4e7',
    tooltipText: isDarkMode ? '#f4f4f5' : '#18181b',
    // Linha principal: Usando Emerald/Green para dar vida, mas mantendo escuro no light mode
    line: isDarkMode ? '#34d399' : '#059669', // emerald-400 : emerald-600
    gradientStart: isDarkMode ? '#34d399' : '#059669',
  };

  return (
    <div className="w-full h-full min-w-0">
      <ResponsiveContainer width="99%" height="100%" key={isDarkMode ? 'dark' : 'light'}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.gradientStart} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={colors.gradientStart} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
          <XAxis 
            dataKey="dia" 
            stroke={colors.text} 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            stroke={colors.text} 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `R$${value}`}
            domain={[0, 'auto']}
            dx={-10}
            width={80} // Garante espaço para valores maiores
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: colors.tooltipBg, 
              borderRadius: '8px', 
              border: `1px solid ${colors.tooltipBorder}`, 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              color: colors.tooltipText
            }}
            itemStyle={{ color: colors.tooltipText }}
            formatter={(value: number) => [formatCurrency(value), 'Vendas']}
            labelStyle={{ color: colors.text, marginBottom: '0.25rem' }}
            cursor={{ stroke: colors.text, strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Area 
            type="monotone" 
            dataKey="total" 
            stroke={colors.line} 
            fillOpacity={1} 
            fill="url(#colorTotal)" 
            strokeWidth={3}
            dot={{ r: 4, fill: colors.line, strokeWidth: 2, stroke: isDarkMode ? '#18181b' : '#fff' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};