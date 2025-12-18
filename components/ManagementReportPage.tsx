import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  TrendingUp, DollarSign, Tag, 
  Calendar, ShoppingBag, HelpCircle, Filter, CreditCard, Undo2, Archive, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { Card } from './ui/Card';
import { mockService } from '../services/mockService';
import { Sale, Product, StockEntry } from '../types';

// Tooltip Component Interno
const ReportTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-flex items-center justify-center ml-1.5 align-middle cursor-help">
    <HelpCircle size={14} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 dark:bg-zinc-700 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-center leading-relaxed font-normal normal-case">
      {text}
      {/* Seta do tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-900 dark:border-t-zinc-700"></div>
    </div>
  </div>
);

export const ManagementReportPage: React.FC = () => {
  // Configuração de datas padrão (Início do mês até hoje) - Usando Horário Local
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // Primeiro dia do mês
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para controlar o tema atual para os gráficos
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  // Monitora mudanças na classe 'dark' do elemento HTML
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [salesData, productsData, stockData] = await Promise.all([
          // Busca baseada no filtro de data
          mockService.getSalesByPeriod(startDate, endDate), 
          mockService.getProducts(),
          mockService.getStockEntries()
        ]);
        setSales(salesData);
        setProducts(productsData);
        setStockEntries(stockData);
      } catch (error) {
        console.error("Erro ao carregar dados do relatório", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate]); // Recarrega quando as datas mudam

  // --- CÁLCULOS E PROCESSAMENTO DE DADOS ---

  // Helper para arredondamento monetário preciso (2 casas decimais)
  const roundCurrency = (value: number) => {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  };

  const kpis = useMemo(() => {
    if (loading) return null;

    // 1. Total Bruto vs Líquido
    let totalGross = 0;
    let totalReturns = 0; 
    let totalCreditNextMonth = 0;
    let totalCancelledSalesCount = 0;
    let totalReturnedItemsCount = 0;
    
    // Descontos
    let totalDiscountOverall = 0;
    let totalDiscountExtra = 0;
    let totalGiftCardUsed = 0; 

    // Taxas (Fees)
    let totalFees = 0;

    // Quantidades
    let totalItemsSold = 0;

    // Custo dos Produtos Vendidos (CMV) para o fluxo
    let totalCustoVendas = 0;

    // Maps para Gráficos e Agrupamentos
    const paymentMethodMap: Record<string, number> = {};
    const brandSalesMap: Record<string, number> = {}; 
    const brandRevenueMap: Record<string, number> = {}; 
    const discountsByMethod: Record<string, number> = {}; 
    const feesByMethod: Record<string, number> = {}; 

    sales.forEach(sale => {
      const isCancelled = sale.status === 'cancelled';
      const method = sale.metodo_pagamento || 'Outros';

      if (isCancelled) totalCancelledSalesCount++;

      if (sale.items) {
        sale.items.forEach(item => {
           const isReturnedItem = item.status === 'returned';
           const itemGross = item.quantidade * item.preco_unitario;
           totalGross += roundCurrency(itemGross);
           
           if (isReturnedItem) {
             totalReturns += roundCurrency(item.subtotal);
             totalReturnedItemsCount += item.quantidade;
           } else if (!isCancelled) {
             totalItemsSold += item.quantidade;
             const custoSnapshot = item.custo_unitario || 0;
             const itemCostTotal = item.quantidade * custoSnapshot;
             totalCustoVendas += roundCurrency(itemCostTotal);
             brandSalesMap[item.marca] = (brandSalesMap[item.marca] || 0) + item.quantidade;
             brandRevenueMap[item.marca] = (brandRevenueMap[item.marca] || 0) + item.subtotal;
           }
        });
      }

      if (!isCancelled) {
        let saleRevenue = sale.valor_liquido_lojista;
        if (saleRevenue === undefined || saleRevenue === null) {
            const appliedFee = sale.taxas_aplicadas?.valor || 0;
            saleRevenue = sale.valor_total - appliedFee;
        }
        
        saleRevenue = roundCurrency(saleRevenue);
        const saleExtraDiscount = roundCurrency(sale.desconto_extra || 0);
        const saleGiftCard = roundCurrency(sale.uso_vale_presente || 0);
        let saleItemsDiscount = 0;

        if (sale.items) {
            sale.items.forEach(i => {
                if (i.status !== 'returned') {
                    saleItemsDiscount += roundCurrency(i.desconto || 0);
                }
            });
        }

        totalDiscountExtra += saleExtraDiscount;
        totalGiftCardUsed += saleGiftCard;
        totalDiscountOverall += roundCurrency(saleItemsDiscount + saleExtraDiscount + saleGiftCard);

        if (saleItemsDiscount > 0) {
            discountsByMethod[method] = roundCurrency((discountsByMethod[method] || 0) + saleItemsDiscount);
        }

        const saleFee = sale.taxas_aplicadas?.valor || 0;
        if (saleFee > 0) {
           feesByMethod[method] = roundCurrency((feesByMethod[method] || 0) + saleFee);
           totalFees += roundCurrency(saleFee);
        }

        if (method === 'Cartão de Crédito' && (sale.parcelas || 1) > 1) {
            const installmentValue = saleRevenue / (sale.parcelas || 1);
            totalCreditNextMonth += roundCurrency(installmentValue);
        }

        paymentMethodMap[method] = roundCurrency((paymentMethodMap[method] || 0) + saleRevenue);
      }
    });

    const stockCostByBrandMap: Record<string, number> = {};
    let totalStockValue = 0;
    products.forEach(p => {
      const val = roundCurrency((p.quantidade_estoque || 0) * (p.preco_custo || 0));
      stockCostByBrandMap[p.marca] = roundCurrency((stockCostByBrandMap[p.marca] || 0) + val);
      totalStockValue += val;
    });

    const totalNetCalculated = roundCurrency(totalGross - totalReturns - totalDiscountOverall - totalFees);

    return {
      totalGross: roundCurrency(totalGross),
      totalNet: totalNetCalculated,
      totalReturns: roundCurrency(totalReturns),
      totalDiscountOverall: roundCurrency(totalDiscountOverall),
      discountsByMethod,
      totalDiscountExtra,
      totalGiftCardUsed: roundCurrency(totalGiftCardUsed),
      totalFees: roundCurrency(totalFees),
      feesByMethod,
      totalCreditNextMonth: roundCurrency(totalCreditNextMonth),
      totalSalesCount: sales.filter(s => s.status !== 'cancelled').length,
      totalCancelledSalesCount,
      totalReturnedItemsCount,
      totalItemsSold,
      totalCustoVendas: roundCurrency(totalCustoVendas),
      paymentData: Object.keys(paymentMethodMap).map(k => ({ name: k, value: paymentMethodMap[k] })),
      brandSalesData: Object.keys(brandSalesMap).map(k => ({ name: k, qtd: brandSalesMap[k], revenue: brandRevenueMap[k] })),
      stockCostByBrandData: Object.entries(stockCostByBrandMap).map(([name, value]) => ({ name, value })),
      totalStockValue: roundCurrency(totalStockValue)
    };

  }, [sales, products, stockEntries, loading, startDate, endDate]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const colors = {
    text: isDarkMode ? '#a1a1aa' : '#71717a', 
    grid: isDarkMode ? '#3f3f46' : '#e4e4e7',
    tooltipBg: isDarkMode ? '#18181b' : '#fff',
    tooltipBorder: isDarkMode ? '#3f3f46' : '#e4e4e7',
    tooltipText: isDarkMode ? '#f4f4f5' : '#18181b',
    primaryBar: isDarkMode ? '#f4f4f5' : '#18181b', 
  };

  const CHART_COLORS = isDarkMode 
    ? ['#e4e4e7', '#a1a1aa', '#60a5fa', '#f87171', '#fbbf24', '#c084fc'] 
    : ['#18181b', '#52525b', '#2563eb', '#dc2626', '#d97706', '#9333ea'];

  if (loading && !kpis) {
    return <div className="h-96 flex items-center justify-center text-zinc-400">Calculando indicadores...</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      
      {/* Header com Filtros de Data */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">
             Relatório Gerencial
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">Análise cruzada de operação, financeiro e estoque.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
           <div className="flex flex-col">
             <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1 ml-1">Início</label>
             <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                />
             </div>
           </div>
           <div className="flex flex-col">
             <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1 ml-1">Fim</label>
             <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                />
             </div>
           </div>
           <div className="flex items-end">
              <button 
                onClick={() => {}} 
                className="h-[34px] px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-md transition-colors"
                title="Atualizar"
              >
                <Filter size={16} />
              </button>
           </div>
        </div>
      </div>

      {!kpis ? (
         <div className="h-64 flex items-center justify-center text-zinc-400">Carregando dados...</div>
      ) : (
      <>
        {/* BLOCO 1: FINANCEIRO MACRO - GRID 3x2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* DOBRA 1: Fluxo (Lucro Bruto) */}
          <Card className="border-l-4 border-l-zinc-800 dark:border-l-zinc-100">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <TrendingUp size={14} /> Fluxo (Lucro Bruto)
                  <ReportTooltip text="Resultado da operação de vendas no período: Receita Real (Líquida de taxas) menos o Custo da Mercadoria Vendida (CMV)." />
                </span>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400 dark:text-zinc-400">Custo (CMV):</span>
                      <span>{formatCurrency(kpis.totalCustoVendas)}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400 dark:text-zinc-400">Receita Real:</span>
                      <span>{formatCurrency(kpis.totalNet)}</span>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-2"></div>
                  <div className="flex justify-between text-base font-bold text-zinc-900 dark:text-white">
                      <span>Total</span>
                      <span className={kpis.totalNet - kpis.totalCustoVendas >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(roundCurrency(kpis.totalNet - kpis.totalCustoVendas))}
                      </span>
                  </div>
                </div>
              </div>
          </Card>

          {/* DOBRA 2: Receita Real vs Potencial */}
          <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-500">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <DollarSign size={14} /> Receita Real vs Potencial
                  <ReportTooltip text="Detalhamento da perda de receita do valor bruto (etiqueta) até o valor líquido real." />
                </span>
                <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white dark:text-zinc">Total Bruto (Etiqueta):</span>
                      <span className="font-medium text-white dark:text-zinc">{formatCurrency(kpis.totalGross)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Devoluções:</span>
                      <span>{formatCurrency(kpis.totalReturns)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Diferença Descontos:</span>
                      <span>{formatCurrency(kpis.totalDiscountOverall)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Taxas Maquininha:</span>
                      <span>{formatCurrency(kpis.totalFees)}</span>
                    </div>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-zinc-800 dark:text-white">Receita Real</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(kpis.totalNet)}</span>
                    </div>
                </div>
              </div>
          </Card>

          {/* DOBRA 3: Total Devoluções */}
          <Card className="border-l-4 border-l-red-600 dark:border-l-red-400">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Undo2 size={14} /> Total Devoluções
                  <ReportTooltip text="Soma dos valores (subtotal) de todos os itens devolvidos ou de vendas canceladas no período." />
                </span>
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {formatCurrency(kpis.totalReturns)}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                   Impacto direto no faturamento bruto.
                </p>
              </div>
          </Card>

          {/* DOBRA 4: Total Descontos */}
          <Card className="border-l-4 border-l-amber-500 dark:border-l-amber-500">
              <div className="flex flex-col gap-1 h-full justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mb-2">
                    <Tag size={14} /> Total Descontos
                    <ReportTooltip text="Soma de todos os descontos concedidos nas vendas efetivadas (pagamento + extras + vale presente)." />
                  </span>
                  
                  <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1 custom-scrollbar">
                    {Object.entries(kpis.discountsByMethod).map(([method, amount]: [string, number]) => (
                        <div key={method} className="flex justify-between text-[10px]">
                          <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">{method}:</span>
                          <span className="text-zinc-500">-{formatCurrency(amount)}</span>
                        </div>
                    ))}
                    {kpis.totalDiscountExtra > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-600 dark:text-zinc-400">Extras (Negociação):</span>
                          <span className="text-zinc-500">-{formatCurrency(kpis.totalDiscountExtra)}</span>
                        </div>
                    )}
                    {kpis.totalGiftCardUsed > 0 && (
                        <div className="flex justify-between text-[10px] pt-1">
                          <span className="text-zinc-600 dark:text-zinc-400">Vale Presente:</span>
                          <span className="text-zinc-600 dark:text-zinc-400">-{formatCurrency(kpis.totalGiftCardUsed)}</span>
                        </div>
                    )}
                  </div>
                </div>

                <div className="mt-2">
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2"></div>
                  <div className="flex justify-between font-bold text-sm text-zinc-800 dark:text-white">
                      <span>Total</span>
                      <span>{formatCurrency(kpis.totalDiscountOverall)}</span>
                  </div>
                </div>
              </div>
          </Card>

          {/* DOBRA 5: Total Taxas */}
          <Card className="border-l-4 border-l-zinc-400 dark:border-l-zinc-600">
              <div className="flex flex-col gap-1 h-full justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mb-2">
                    <CreditCard size={14} /> Total Taxas
                    <ReportTooltip text="Custo operacional com taxas de cartão (maquininha) das vendas efetivadas." />
                  </span>
                  
                  <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1 custom-scrollbar">
                    {Object.entries(kpis.feesByMethod).map(([method, amount]: [string, number]) => (
                        <div key={method} className="flex justify-between text-[10px]">
                          <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">{method}:</span>
                          <span className="text-zinc-500">-{formatCurrency(amount)}</span>
                        </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2">
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2"></div>
                  <div className="flex justify-between font-bold text-sm text-zinc-800 dark:text-white">
                      <span>Total Taxas</span>
                      <span>{formatCurrency(kpis.totalFees)}</span>
                  </div>
                </div>
              </div>
          </Card>

          {/* DOBRA 6: A Receber (Próx.) */}
          <Card className="border-l-4 border-l-purple-500 dark:border-l-purple-500">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Calendar size={14} /> A Receber (Próximo Mês)
                  <ReportTooltip text="Previsão de entrada de caixa no próximo mês referente a parcelas de cartão de crédito (Líquido de taxas)." />
                </span>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-2">
                  {formatCurrency(kpis.totalCreditNextMonth)}
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Saldo líquido de parcelados.
                </p>
              </div>
          </Card>
        </div>

        {/* BLOCO 2: GRÁFICOS DE OPERAÇÃO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Vendas por Meio de Pagamento */}
          <Card 
            title={<>Receita Real por Tipo de Pagamento <ReportTooltip text="Volume financeiro efetivo (Líquido de taxas) agrupado por método de pagamento." /></>} 
            className="min-h-[350px]"
          >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={kpis.paymentData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                  <XAxis 
                      dataKey="name" 
                      tick={{fontSize: 12, fill: colors.text}} 
                      interval={0}
                  />
                  <YAxis 
                      tickFormatter={(val: number) => `R$${val}`} 
                      tick={{fontSize: 12, fill: colors.text}} 
                  />
                  <Tooltip 
                      cursor={{fill: isDarkMode ? '#27272a' : '#f4f4f5'}}
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: colors.tooltipBg, 
                        borderColor: colors.tooltipBorder, 
                        color: colors.tooltipText 
                      }}
                      itemStyle={{ color: colors.tooltipText }}
                  />
                  <Bar dataKey="value" fill={colors.primaryBar} radius={[4, 4, 0, 0]}>
                      {kpis.paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          </Card>

          {/* Custo de Estoque por Marca */}
          <Card 
            title={<>Custo de Estoque por Marca <ReportTooltip text="Valor total de custo acumulado dos produtos atualmente em estoque, agrupado por marca." /></>} 
            className="min-h-[350px]"
          >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={kpis.stockCostByBrandData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                  <XAxis 
                      dataKey="name" 
                      tick={{fontSize: 12, fill: colors.text}} 
                      interval={0}
                  />
                  <YAxis 
                      tickFormatter={(val: number) => `R$${val}`} 
                      tick={{fontSize: 12, fill: colors.text}} 
                  />
                  <Tooltip 
                      cursor={{fill: isDarkMode ? '#27272a' : '#f4f4f5'}}
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: colors.tooltipBg, 
                        borderColor: colors.tooltipBorder, 
                        color: colors.tooltipText 
                      }}
                      itemStyle={{ color: colors.tooltipText }}
                  />
                  <Bar dataKey="value" fill={colors.primaryBar} radius={[4, 4, 0, 0]}>
                      {kpis.stockCostByBrandData.sort((a, b) => b.value - a.value).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                 <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase flex items-center gap-2">
                    <Archive size={16} /> Total Geral Investido
                 </span>
                 <span className="text-lg font-bold text-zinc-900 dark:text-white">{formatCurrency(kpis.totalStockValue)}</span>
              </div>
          </Card>

          {/* Performance por Marca */}
          <Card 
            title={<>Performance por Marca <ReportTooltip text="Barras representam qtd. de peças; Tooltip mostra faturamento efetivo." /></>} 
            description="Volume de peças vendidas (excluindo devolvidas)"
            className="min-h-[350px]"
          >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={kpis.brandSalesData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.grid} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={80} tick={{fontSize: 12, fill: colors.text}} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      formatter={(value: number, name: string) => [name === 'qtd' ? value : formatCurrency(value), name === 'qtd' ? 'Peças' : 'Faturamento']} 
                      contentStyle={{ 
                        backgroundColor: colors.tooltipBg, 
                        borderColor: colors.tooltipBorder, 
                        color: colors.tooltipText 
                      }}
                      itemStyle={{ color: colors.tooltipText }}
                    />
                    <Bar dataKey="qtd" fill={colors.primaryBar} radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: colors.text, fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
          </Card>

          {/* Fluxo de Quantidades */}
          <Card 
            title={<>Fluxo de Quantidades <ReportTooltip text="Resumo quantitativo da operação no período selecionado." /></>} 
            description="Transações e movimentação de peças"
            className="min-h-[350px]"
          >
              <div className="grid grid-cols-2 gap-3 h-full items-center py-2">
                 {/* Vendas Efetivas */}
                 <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                    <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 mb-1.5" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Vendas Efetivas</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white leading-none">{kpis.totalSalesCount}</p>
                 </div>

                 {/* Vendas Canceladas */}
                 <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                    <AlertTriangle size={20} className="text-red-600 mb-1.5" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Vendas Canceladas</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white leading-none">{kpis.totalCancelledSalesCount}</p>
                 </div>

                 {/* Peças Vendidas */}
                 <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                    <ShoppingBag size={20} className="text-blue-600 dark:text-blue-400 mb-1.5" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Peças Vendidas</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white leading-none">{kpis.totalItemsSold}</p>
                 </div>

                 {/* Itens Devolvidos */}
                 <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                    <Undo2 size={20} className="text-amber-600 dark:text-amber-400 mb-1.5" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight text-center leading-[1.1]">Itens Devolvidos <br/> <span className="text-[8px] opacity-70">(Cancelados)</span></p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white leading-none">{kpis.totalReturnedItemsCount}</p>
                 </div>
              </div>
          </Card>

        </div>
      </>
      )}

    </div>
  );
};