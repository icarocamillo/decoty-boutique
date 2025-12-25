
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  TrendingUp, DollarSign, Tag, 
  Calendar, ShoppingBag, HelpCircle, Filter, CreditCard, Undo2, Archive, CheckCircle2, AlertTriangle, Gift, BookOpen, Info, ArrowUpRight
} from 'lucide-react';
import { Card } from './ui/Card';
import { mockService, PaymentFees } from '../services/mockService';
import { Sale, Product, StockEntry, Client } from '../types';

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
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); 
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [sales, setSales] = useState<Sale[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [globalFees, setGlobalFees] = useState<PaymentFees | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

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
        // Aumentado para 12 meses para capturar parcelamentos longos que liquidam no período atual
        const historyStart = new Date(startDate);
        historyStart.setMonth(historyStart.getMonth() - 12);
        const historyStartStr = historyStart.toISOString().split('T')[0];

        const [salesData, receiptsData, productsData, stockData, clientsData, feesData] = await Promise.all([
          mockService.getSalesByPeriod(historyStartStr, endDate), 
          mockService.getReceiptsByPeriod(historyStartStr, endDate),
          mockService.getProducts(),
          mockService.getStockEntries(),
          mockService.getClients(),
          mockService.getPaymentFees()
        ]);
        setSales(salesData);
        setReceipts(receiptsData);
        setProducts(productsData);
        setStockEntries(stockData);
        setClients(clientsData);
        setGlobalFees(feesData);
      } catch (error) {
        console.error("Erro ao carregar dados do relatório", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate]);

  const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

  const calculateSingleReceiptFee = useCallback((amount: number, method: string, parcelas: number = 1) => {
    if (!globalFees) return 0;
    let percent = 0;
    if (method === 'Cartão de Débito') percent = globalFees.debit;
    else if (method === 'Cartão de Crédito') {
        percent = parcelas > 1 ? globalFees.credit_installment : globalFees.credit_spot;
    }
    return roundCurrency(amount * (percent / 100));
  }, [globalFees]);

  const isFuturePeriod = useMemo(() => {
      const today = new Date();
      today.setHours(0,0,0,0);
      return new Date(startDate) > today;
  }, [startDate]);

  const kpis = useMemo(() => {
    if (loading) return null;

    const sDate = new Date(`${startDate}T00:00:00`);
    const eDate = new Date(`${endDate}T23:59:59`);
    const nextMonthBoundary = new Date(eDate);
    nextMonthBoundary.setMonth(nextMonthBoundary.getMonth() + 1);

    let totalReturns = 0; 
    let totalCreditNextMonth = 0;
    let totalCrediarioPending = 0; 
    let totalCancelledSalesCount = 0;
    let totalReturnedItemsCount = 0;
    let totalDiscountOverall = 0;
    let totalDiscountExtra = 0;
    let totalGiftCardUsed = 0; 
    let totalFees = 0;
    let totalRealRevenue = 0; 
    let totalVendaBrutaEfetiva = 0; 
    let totalCustoVendas = 0; 
    let totalItemsSold = 0;

    const paymentMethodMap: Record<string, number> = {};
    const brandSalesMap: Record<string, number> = {}; 
    const brandRevenueMap: Record<string, number> = {}; 
    const discountsByMethod: Record<string, number> = {}; 
    const feesByMethod: Record<string, number> = {}; 

    // --- 1. PROCESSAR VENDAS (REGIME HÍBRIDO) ---
    sales.forEach(sale => {
      const isCancelled = sale.status === 'cancelled';
      const method = sale.metodo_pagamento || 'Outros';
      const saleDate = new Date(sale.data_venda);
      const isSaleInPeriod = saleDate >= sDate && saleDate <= eDate;

      // 1.1 CMV E OPERACIONAL (Baseado na DATA DA VENDA - Regime de Competência)
      if (isSaleInPeriod && !isCancelled && sale.items) {
          sale.items.forEach(item => {
              if (item.status !== 'returned') {
                  totalItemsSold += item.quantidade;
                  totalCustoVendas += roundCurrency(item.quantidade * (item.custo_unitario || 0));
                  brandSalesMap[item.marca] = (brandSalesMap[item.marca] || 0) + item.quantidade;
                  brandRevenueMap[item.marca] = (brandRevenueMap[item.marca] || 0) + item.subtotal;
              }
          });

          const saleExtraDiscount = roundCurrency(sale.desconto_extra || 0);
          let saleItemsDiscount = 0;
          sale.items?.forEach(i => { if (i.status !== 'returned') saleItemsDiscount += roundCurrency(i.desconto || 0); });
          totalDiscountExtra += saleExtraDiscount;
          totalDiscountOverall += roundCurrency(saleItemsDiscount + saleExtraDiscount);
          if (saleItemsDiscount > 0) discountsByMethod[method] = roundCurrency((discountsByMethod[method] || 0) + saleItemsDiscount);
          
          totalGiftCardUsed = roundCurrency(totalGiftCardUsed + (sale.uso_vale_presente || 0));
      }

      // 1.2 ENTRADAS FINANCEIRAS (REGIME DE CAIXA)
      if (!isCancelled) {
          if (method === 'Cartão de Crédito') {
              const installments = sale.parcelas || 1;
              const totalNetSale = sale.valor_total - (sale.taxas_aplicadas?.valor || 0);
              const totalFeesSale = sale.taxas_aplicadas?.valor || 0;

              for (let i = 1; i <= installments; i++) {
                  const settlementDate = new Date(saleDate);
                  settlementDate.setDate(settlementDate.getDate() + (30 * i));

                  const instGross = sale.valor_total / installments;
                  const instNet = totalNetSale / installments;
                  const instFee = totalFeesSale / installments;

                  // Se a parcela liquida no banco dentro do período que estamos filtrando
                  if (settlementDate >= sDate && settlementDate <= eDate) {
                      totalVendaBrutaEfetiva += instGross;
                      totalRealRevenue += instNet;
                      totalFees += instFee;
                      paymentMethodMap[method] = roundCurrency((paymentMethodMap[method] || 0) + instNet);
                      feesByMethod[method] = roundCurrency((feesByMethod[method] || 0) + instFee);
                  } 
                  // Se liquida no mês seguinte ao fim do filtro
                  else if (settlementDate > eDate && settlementDate <= nextMonthBoundary) {
                      totalCreditNextMonth += instNet;
                  }
              }
          } else if (method === 'Crediário') {
              if (isSaleInPeriod) {
                  const totalPaidToDate = sale.pagamentos_crediario?.reduce((sum, p) => sum + Number(p.valor || 0), 0) || 0;
                  const remainingOnThisSale = Math.max(0, sale.valor_total - totalPaidToDate);
                  totalCrediarioPending += roundCurrency(remainingOnThisSale);
              }
          } else {
              // Dinheiro, Pix, Débito (Liquidação imediata D+0/D+1)
              if (isSaleInPeriod) {
                  const saleGross = sale.valor_total + (sale.uso_vale_presente || 0);
                  const saleFee = sale.taxas_aplicadas?.valor || 0;
                  const saleNet = (sale.valor_liquido_lojista ?? (sale.valor_total - saleFee)) + (sale.uso_vale_presente || 0);

                  totalVendaBrutaEfetiva += saleGross;
                  totalRealRevenue += saleNet;
                  totalFees += saleFee;
                  paymentMethodMap[method] = roundCurrency((paymentMethodMap[method] || 0) + saleNet);
                  if (saleFee > 0) feesByMethod[method] = roundCurrency((feesByMethod[method] || 0) + saleFee);
              }
          }
      } else if (isSaleInPeriod) {
          totalCancelledSalesCount++;
      }

      // Devoluções baseadas na data da venda (competência)
      if (isSaleInPeriod && (isCancelled || (sale.items?.some(i => i.status === 'returned')))) {
          const totalItemsInSale = sale.item_count || 1;
          const extraDiscountPerUnit = (sale.desconto_extra || 0) / totalItemsInSale;
          sale.items?.forEach(item => {
              if (item.status === 'returned' || isCancelled) {
                  const itemNetRefund = roundCurrency(item.subtotal - (item.quantidade * extraDiscountPerUnit));
                  totalReturns += itemNetRefund;
                  totalReturnedItemsCount += item.quantidade;
              }
          });
      }
    });

    // --- 2. PROCESSAR RECEBIMENTOS DE CREDIÁRIO (REGIME DE CAIXA) ---
    receipts.forEach(rec => {
        const val = Number(rec.valor_pago || 0);
        const method = rec.metodo_pagamento || 'Dinheiro';
        const parcelas = Number(rec.parcelas || 1);
        const receiptDate = new Date(rec.data_recebimento);
        const feeTotal = calculateSingleReceiptFee(val, method, parcelas);
        const netTotal = roundCurrency(val - feeTotal);

        if (method === 'Cartão de Crédito') {
            for (let i = 1; i <= parcelas; i++) {
                const settlementDate = new Date(receiptDate);
                settlementDate.setDate(settlementDate.getDate() + (30 * i));

                const instGross = val / parcelas;
                const instNet = netTotal / parcelas;
                const instFee = feeTotal / parcelas;

                if (settlementDate >= sDate && settlementDate <= eDate) {
                    totalVendaBrutaEfetiva += instGross;
                    totalRealRevenue += instNet;
                    totalFees += instFee;
                    paymentMethodMap[method] = roundCurrency((paymentMethodMap[method] || 0) + instNet);
                    feesByMethod[method] = roundCurrency((feesByMethod[method] || 0) + instFee);
                } 
                else if (settlementDate > eDate && settlementDate <= nextMonthBoundary) {
                    totalCreditNextMonth += instNet;
                }
            }
        } else {
            if (receiptDate >= sDate && receiptDate <= eDate) {
                totalVendaBrutaEfetiva += val;
                totalRealRevenue += netTotal;
                totalFees += feeTotal;
                if (feeTotal > 0) feesByMethod[method] = roundCurrency((feesByMethod[method] || 0) + feeTotal);
                paymentMethodMap[method] = roundCurrency((paymentMethodMap[method] || 0) + netTotal);
            }
        }
    });

    // --- 3. ESTOQUE E VALE PRESENTE ---
    const stockCostByBrandMap: Record<string, number> = {};
    let totalStockValue = 0;
    products.forEach(p => {
      const val = roundCurrency((p.quantidade_estoque || 0) * (p.preco_custo || 0));
      stockCostByBrandMap[p.marca] = roundCurrency((stockCostByBrandMap[p.marca] || 0) + val);
      totalStockValue += val;
    });

    let totalClientBalance = 0;
    clients.forEach(c => { totalClientBalance += roundCurrency(c.saldo_vale_presente || 0); });

    return {
      totalNet: roundCurrency(totalRealRevenue),
      totalReturns: roundCurrency(totalReturns),
      totalDiscountOverall: roundCurrency(totalDiscountOverall),
      discountsByMethod,
      totalDiscountExtra,
      totalGiftCardUsed: roundCurrency(totalGiftCardUsed),
      totalClientBalance: roundCurrency(totalClientBalance),
      totalFees: roundCurrency(totalFees),
      feesByMethod,
      totalCreditNextMonth: roundCurrency(totalCreditNextMonth),
      totalCrediarioPending: roundCurrency(totalCrediarioPending),
      totalSalesCount: sales.filter(s => {
          const d = new Date(s.data_venda);
          return d >= sDate && d <= eDate && s.status !== 'cancelled';
      }).length,
      totalCancelledSalesCount,
      totalReturnedItemsCount,
      totalItemsSold,
      totalCustoVendas: roundCurrency(totalCustoVendas),
      totalVendaBrutaEfetiva: roundCurrency(totalVendaBrutaEfetiva),
      paymentData: Object.keys(paymentMethodMap).map(k => ({ name: k, value: paymentMethodMap[k] })),
      brandSalesData: Object.keys(brandSalesMap).map(k => ({ name: k, qtd: brandSalesMap[k], revenue: brandRevenueMap[k] })),
      stockCostByBrandData: Object.entries(stockCostByBrandMap).map(([name, value]) => ({ name, value })),
      totalStockValue: roundCurrency(totalStockValue)
    };

  }, [sales, receipts, products, stockEntries, clients, loading, startDate, endDate, calculateSingleReceiptFee]);

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

      {isFuturePeriod && (
          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/50 p-4 rounded-xl flex items-start gap-4 animate-fade-in shadow-sm">
             <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-lg text-purple-600 dark:text-purple-300">
                <ArrowUpRight size={20} />
             </div>
             <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-300">Projeção de Fluxo de Caixa</h4>
                <p className="text-xs text-zinc-700 dark:text-zinc-400 mt-1 leading-relaxed">
                   O período selecionado está no futuro. Os valores abaixo representam a <strong>previsão de entrada no banco</strong> das parcelas de cartão de crédito e crediário de vendas já realizadas no passado.
                </p>
             </div>
          </div>
      )}

      {!kpis ? (
         <div className="h-64 flex items-center justify-center text-zinc-400">Carregando dados...</div>
      ) : (
      <>
        {/* BLOCO 1: FINANCEIRO MACRO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* DOBRA 1: Fluxo (Lucro Bruto) */}
          <Card className="border-l-4 border-l-blue-400 dark:border-l-blue-400">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <TrendingUp size={14} /> Fluxo (Lucro Bruto)
                  <ReportTooltip text="Visão de Caixa Real: Entradas brutas liquidadas no banco dentro do período filtrado (incluindo pagamentos de crediário e parcelas de vendas passadas que vencem agora) subtraídas do custo das mercadorias vendidas NO PERÍODO." />
                </span>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400 dark:text-zinc-400">Custo (Saída de Estoque):</span>
                      <span>{formatCurrency(kpis.totalCustoVendas)}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400 dark:text-zinc-400">Entrada Bruta (Banco):</span>
                      <span>{formatCurrency(kpis.totalVendaBrutaEfetiva)}</span>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-2"></div>
                  <div className="flex justify-between text-base font-bold text-zinc-900 dark:text-white">
                      <span>Resultado Final</span>
                      <span className={kpis.totalVendaBrutaEfetiva - kpis.totalCustoVendas >= 0 ? 'text-blue-400' : 'text-red-600'}>
                        {formatCurrency(roundCurrency(kpis.totalVendaBrutaEfetiva - kpis.totalCustoVendas))}
                      </span>
                  </div>
                </div>
              </div>
          </Card>

          {/* DOBRA 2: Receita Real vs Potencial */}
          <Card className="border-l-4 border-l-emerald-600 dark:border-l-emerald-500">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <DollarSign size={14} /> Receita Real (Líquida)
                  <ReportTooltip text="Dinheiro disponível: Valor líquido total após descontos e taxas bancárias de todos os recebíveis liquidados no período filtrado. Reflete o saldo real que entrou na conta." />
                </span>
                <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-600 dark:text-zinc-300 font-medium">Entrada Bruta (Banco):</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{formatCurrency(kpis.totalVendaBrutaEfetiva)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Descontos Oferecidos:</span>
                      <span className="text-zinc-600">-{formatCurrency(kpis.totalDiscountOverall)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Taxas Bancárias (Líquidas):</span>
                      <span className="text-zinc-500">-{formatCurrency(kpis.totalFees)}</span>
                    </div>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-zinc-800 dark:text-white">Faturamento Líquido</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500">{formatCurrency(kpis.totalNet)}</span>
                    </div>
                </div>
              </div>
          </Card>

          {/* DOBRA 3: Total Devoluções */}
          <Card className="border-l-4 border-l-red-600 dark:border-l-red-400">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Undo2 size={14} /> Total Devoluções
                  <ReportTooltip text="Impacto operacional: Soma dos valores de itens devolvidos ou vendas canceladas CUJA DATA DA OPERAÇÃO está dentro do período selecionado." />
                </span>
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {formatCurrency(kpis.totalReturns)}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                   Estornos do período operacional.
                </p>
              </div>
          </Card>

          {/* DOBRA 4: Total Descontos */}
          <Card className="border-l-4 border-l-zinc-400 dark:border-l-zinc-600">
              <div className="flex flex-col gap-1 h-full justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mb-2">
                    <Tag size={14} /> Total Descontos
                    <ReportTooltip text="Soma de descontos de negociação e taxas de método das vendas REALIZADAS no período operacional." />
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
                          <span className="text-zinc-600 dark:text-zinc-400">Desconto Extra (Negociação):</span>
                          <span className="text-zinc-500">-{formatCurrency(kpis.totalDiscountExtra)}</span>
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
                    <ReportTooltip text="Custo operacional total com taxas de cartão liquidadas no período filtrado. Considera taxas de vendas imediatas e de quitações de crediário." />
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

          {/* DOBRA 6: Indicadores Vale Presente */}
          <Card className="border-l-4 border-l-amber-600 dark:border-l-amber-500">
              <div className="flex flex-col gap-1 h-full">
                <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Gift size={14} /> Indicadores Vale Presente
                  <ReportTooltip text="Créditos pré-pagos: 'Utilizado' é o valor resgatado no período. 'Saldo Disponível' é a dívida da loja com os clientes no momento (Passivo)." />
                </span>
                
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                      <span>Utilizado no Período</span>
                    </div>
                    <h3 className="text-xl font-bold text-amber-600 dark:text-amber-500 leading-tight">
                      {formatCurrency(kpis.totalGiftCardUsed)}
                    </h3>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                      <span>Saldo Total em Clientes (Hoje)</span>
                    </div>
                    <h3 className="text-xl font-bold text-amber-600 dark:text-amber-500 leading-tight">
                      {formatCurrency(kpis.totalClientBalance)}
                    </h3>
                  </div>
                </div>
              </div>
          </Card>

          {/* DOBRA 7: A Receber (Próx. 30 dias) */}
          <Card className="border-l-4 border-l-purple-500 dark:border-l-purple-500">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Calendar size={14} /> A Receber (Próximos 30 dias)
                  <ReportTooltip text="Previsão de caixa: Valor total líquido que cairá no banco nos 30 dias seguintes ao fim do período filtrado." />
                </span>
                <h3 className="text-xl font-bold text-purple-500 dark:text-purple-500 mt-2">
                  {formatCurrency(kpis.totalCreditNextMonth)}
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Recebíveis de cartão pendentes.
                </p>
              </div>
          </Card>

          {/* DOBRA 8: A Receber (Crediário) */}
          <Card className="border-l-4 border-l-purple-500 dark:border-l-purple-500">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <BookOpen size={14} /> A Receber (Crediário)
                  <ReportTooltip text="Pendência de clientes: Total de saldo de vendas em Crediário realizadas no período que ainda não foram quitadas." />
                </span>
                <h3 className="text-xl font-bold text-purple-500 dark:text-purple-500 mt-2">
                  {formatCurrency(kpis.totalCrediarioPending)}
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Dívida ativa de clientes do período.
                </p>
              </div>
          </Card>
        </div>

        {/* BLOCO 2: GRÁFICOS DE OPERAÇÃO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Vendas por Meio de Pagamento */}
          <Card 
            title={<>Receita Real por Tipo de Pagamento <ReportTooltip text="Volume financeiro efetivo (Líquido) agrupado por método. Reflete o que caiu no banco dentro do período." /></>} 
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
            title={<>Custo de Estoque por Marca <ReportTooltip text="Capital imobilizado: Valor total de custo dos produtos atualmente em estoque por marca." /></>} 
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
                    <Archive size={16} /> Valor Total do Estoque
                 </span>
                 <span className="text-lg font-bold text-zinc-900 dark:text-white">{formatCurrency(kpis.totalStockValue)}</span>
              </div>
          </Card>

          {/* Performance por Marca */}
          <Card 
            title={<>Performance por Marca <ReportTooltip text="Volume operacional: Barras mostram peças vendidas; Dica mostra faturamento bruto." /></>} 
            description="Volume de saída no período (exclui devolvidos)"
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
            title={<>Fluxo de Quantidades <ReportTooltip text="Indicadores operacionais do período selecionado." /></>} 
            description="Movimentação física de peças"
            className="min-h-[350px]"
          >
              <div className="grid grid-cols-2 gap-3 h-full items-center py-2">
                 {/* Vendas Efetivas */}
                 <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                    <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 mb-1.5" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Vendas Feitas</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white leading-none">{kpis.totalSalesCount}</p>
                 </div>

                 {/* Vendas Canceladas */}
                 <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                    <AlertTriangle size={20} className="text-red-600 mb-1.5" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Cancelamentos</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white leading-none">{kpis.totalCancelledSalesCount}</p>
                 </div>

                 {/* Peças Vendidas */}
                 <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                    <ShoppingBag size={20} className="text-blue-600 dark:text-blue-400 mb-1.5" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Peças de Saída</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white leading-none">{kpis.totalItemsSold}</p>
                 </div>

                 {/* Itens Devolvidos */}
                 <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                    <Undo2 size={20} className="text-amber-600 dark:text-amber-400 mb-1.5" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight text-center leading-[1.1]">Itens Devolvidos</p>
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
