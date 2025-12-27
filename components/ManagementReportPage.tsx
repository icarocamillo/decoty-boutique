
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  TrendingUp, DollarSign, Tag, 
  Calendar, ShoppingBag, HelpCircle, Filter, CreditCard, Undo2, Archive, CheckCircle2, AlertTriangle, Gift, BookOpen, Info, ArrowUpRight, ArrowRight
} from 'lucide-react';
import { Card } from './ui/Card';
import { backendService, PaymentFees } from '../services/backendService';
import { Sale, Product, StockEntry, Client } from '../types';

// Tooltip Component Interno
const ReportTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-flex items-center justify-center ml-1.5 align-middle cursor-help">
    <HelpCircle size={14} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 dark:bg-zinc-700 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-center leading-relaxed font-normal normal-case">
      {text}
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
        const historyStart = new Date(startDate);
        historyStart.setMonth(historyStart.getMonth() - 12);
        const historyStartStr = historyStart.toISOString().split('T')[0];

        const [salesData, receiptsData, productsData, stockData, clientsData, feesData] = await Promise.all([
          backendService.getSalesByPeriod(historyStartStr, endDate), 
          backendService.getReceiptsByPeriod(historyStartStr, endDate),
          backendService.getProducts(),
          backendService.getStockEntries(),
          backendService.getClients(),
          backendService.getPaymentFees()
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

  const kpis = useMemo(() => {
    if (loading) return null;

    const sDate = new Date(`${startDate}T00:00:00`);
    const eDate = new Date(`${endDate}T23:59:59`);
    const nextMonthBoundary = new Date(eDate);
    nextMonthBoundary.setMonth(nextMonthBoundary.getMonth() + 1);

    const salesMap = new Map<string, Sale>();
    sales.forEach(s => salesMap.set(s.id, s));

    let totalReturns = 0; 
    let totalCreditNextMonth = 0;
    let totalCrediarioPending = 0; 
    let totalCancelledSalesCount = 0;
    let totalReturnedItemsCount = 0;
    let totalDiscountOverall = 0;
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

    // --- 1. PROCESSAR VENDAS ---
    sales.forEach(sale => {
      const isCancelled = sale.status === 'cancelled';
      const method = sale.metodo_pagamento || 'Outros';
      const saleDate = new Date(sale.data_venda);
      const isSaleInPeriod = saleDate >= sDate && saleDate <= eDate;

      const totalSaleItemsCount = sale.items?.length || 1;
      const extraDiscountPerItem = (sale.desconto_extra || 0) / totalSaleItemsCount;
      const giftCardPerItem = (sale.uso_vale_presente || 0) / totalSaleItemsCount;

      // 1.1 CMV E OPERACIONAL (Apenas itens VENDIDOS)
      if (isSaleInPeriod && !isCancelled && sale.items) {
          sale.items.forEach(item => {
              if (item.status === 'sold') {
                  totalItemsSold += item.quantidade;
                  totalCustoVendas += roundCurrency(item.quantidade * (item.custo_unitario || 0));
                  brandSalesMap[item.marca] = (brandSalesMap[item.marca] || 0) + item.quantidade;
                  brandRevenueMap[item.marca] = (brandRevenueMap[item.marca] || 0) + item.subtotal;
              }
          });
      }

      // 1.2 RECEITA (Regime de Caixa por Liquidação)
      const soldItems = sale.items?.filter(i => i.status === 'sold') || [];
      const hasSoldItems = soldItems.length > 0;

      if (!isCancelled && hasSoldItems) {
          // Cálculo de valores da venda para rateio
          const saleRawGross = soldItems.reduce((acc, i) => acc + (i.preco_unitario * i.quantidade), 0);
          const saleDiscounts = soldItems.reduce((acc, i) => acc + (i.desconto || 0), 0) + (extraDiscountPerItem * soldItems.length) + (giftCardPerItem * soldItems.length);
          const saleCashNet = saleRawGross - saleDiscounts; // Valor final que o cliente pagou

          if (method === 'Cartão de Crédito') {
              const installments = sale.parcelas || 1;
              const feePercent = sale.taxas_aplicadas?.porcentagem || 0;
              
              for (let i = 1; i <= installments; i++) {
                  const settlementDate = new Date(saleDate);
                  settlementDate.setDate(settlementDate.getDate() + (30 * i));

                  const instRawGross = saleRawGross / installments;
                  const instDiscount = saleDiscounts / installments;
                  const instCash = saleCashNet / installments;
                  const instFee = instCash * (feePercent / 100);
                  const instNet = instCash - instFee;

                  if (settlementDate >= sDate && settlementDate <= eDate) {
                      totalVendaBrutaEfetiva += instRawGross;
                      totalDiscountOverall += instDiscount;
                      totalRealRevenue += instNet;
                      totalFees += instFee;
                      paymentMethodMap[method] = roundCurrency((paymentMethodMap[method] || 0) + instNet);
                      feesByMethod[method] = roundCurrency((feesByMethod[method] || 0) + instFee);
                      discountsByMethod[method] = roundCurrency((discountsByMethod[method] || 0) + instDiscount);
                  } 
                  else if (settlementDate > eDate && settlementDate <= nextMonthBoundary) {
                      totalCreditNextMonth += instNet;
                  }
              }
          } else if (method === 'Crediário') {
              if (isSaleInPeriod) {
                  const totalPaidToDate = sale.pagamentos_crediario?.reduce((sum, p) => sum + Number(p.valor || 0), 0) || 0;
                  const remainingOnThisSale = Math.max(0, saleCashNet - totalPaidToDate);
                  totalCrediarioPending += roundCurrency(remainingOnThisSale);
              }
          } else {
              // Dinheiro, Pix, Débito
              if (isSaleInPeriod) {
                  const feePercent = sale.taxas_aplicadas?.porcentagem || 0;
                  const saleFeeValue = saleCashNet * (feePercent / 100);
                  const saleFinalNet = saleCashNet - saleFeeValue;

                  totalVendaBrutaEfetiva += saleRawGross;
                  totalDiscountOverall += saleDiscounts;
                  totalRealRevenue += saleFinalNet;
                  totalFees += saleFeeValue;
                  
                  paymentMethodMap[method] = roundCurrency((paymentMethodMap[method] || 0) + saleFinalNet);
                  feesByMethod[method] = roundCurrency((feesByMethod[method] || 0) + saleFeeValue);
                  discountsByMethod[method] = roundCurrency((discountsByMethod[method] || 0) + saleDiscounts);
              }
          }
      } else if (isSaleInPeriod && isCancelled) {
          totalCancelledSalesCount++;
      }

      // Devoluções
      if (isSaleInPeriod && (isCancelled || (sale.items?.some(i => i.status === 'returned')))) {
          sale.items?.forEach(item => {
              if (item.status === 'returned' || isCancelled) {
                  const itemNetRefund = roundCurrency(item.subtotal - extraDiscountPerItem);
                  totalReturns += itemNetRefund;
                  totalReturnedItemsCount += item.quantidade;
              }
          });
      }
    });

    // --- 2. PROCESSAR RECEBIMENTOS DE CREDIÁRIO ---
    receipts.forEach(rec => {
        const parentSale = salesMap.get(rec.venda_id);
        if (!parentSale || parentSale.status === 'cancelled') return;

        const soldItems = parentSale.items?.filter(i => i.status === 'sold') || [];
        if (soldItems.length === 0) return;

        const totalSaleItemsCount = parentSale.items?.length || 1;
        const extraDiscountPerItem = (parentSale.desconto_extra || 0) / totalSaleItemsCount;
        const giftCardPerItem = (parentSale.uso_vale_presente || 0) / totalSaleItemsCount;

        const saleRawGross = soldItems.reduce((acc, i) => acc + (i.preco_unitario * i.quantidade), 0);
        const saleDiscounts = soldItems.reduce((acc, i) => acc + (i.desconto || 0), 0) + (extraDiscountPerItem * soldItems.length) + (giftCardPerItem * soldItems.length);
        const saleCashNet = saleRawGross - saleDiscounts;

        if (saleCashNet <= 0) return;

        const rawVal = Number(rec.valor_pago || 0);
        const method = rec.metodo_pagamento || 'Dinheiro';
        const parcelas = Number(rec.parcelas || 1);
        const receiptDate = new Date(rec.data_recebimento);

        // Fator de proporção do recebimento em relação ao total da venda
        const ratio = rawVal / saleCashNet;
        const equivalentRawGross = saleRawGross * ratio;
        const equivalentDiscount = saleDiscounts * ratio;

        if (method === 'Cartão de Crédito') {
            const feePercent = calculateSingleReceiptFee(100, method, parcelas) / 100;
            
            for (let i = 1; i <= parcelas; i++) {
                const settlementDate = new Date(receiptDate);
                settlementDate.setDate(settlementDate.getDate() + (30 * i));

                const instRawGross = equivalentRawGross / parcelas;
                const instDiscount = equivalentDiscount / parcelas;
                const instCash = rawVal / parcelas;
                const instFee = instCash * feePercent;
                const instNet = instCash - instFee;

                if (settlementDate >= sDate && settlementDate <= eDate) {
                    totalVendaBrutaEfetiva += instRawGross;
                    totalDiscountOverall += instDiscount;
                    totalRealRevenue += instNet;
                    totalFees += instFee;
                    paymentMethodMap[method] = roundCurrency((paymentMethodMap[method] || 0) + instNet);
                    feesByMethod[method] = roundCurrency((feesByMethod[method] || 0) + instFee);
                    discountsByMethod[method] = roundCurrency((discountsByMethod[method] || 0) + instDiscount);
                } 
                else if (settlementDate > eDate && settlementDate <= nextMonthBoundary) {
                    totalCreditNextMonth += instNet;
                }
            }
        } else {
            if (receiptDate >= sDate && receiptDate <= eDate) {
                const feeVal = calculateSingleReceiptFee(rawVal, method, 1);
                const finalNet = rawVal - feeVal;

                totalVendaBrutaEfetiva += equivalentRawGross;
                totalDiscountOverall += equivalentDiscount;
                totalRealRevenue += finalNet;
                totalFees += feeVal;
                
                paymentMethodMap[method] = roundCurrency((paymentMethodMap[method] || 0) + finalNet);
                feesByMethod[method] = roundCurrency((feesByMethod[method] || 0) + feeVal);
                discountsByMethod[method] = roundCurrency((discountsByMethod[method] || 0) + equivalentDiscount);
            }
        }
    });

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
      totalClientBalance: roundCurrency(totalClientBalance),
      totalFees: roundCurrency(totalFees),
      feesByMethod,
      totalCreditNextMonth: roundCurrency(totalCreditNextMonth),
      totalCrediarioPending: roundCurrency(totalCrediarioPending),
      totalSalesCount: sales.filter(s => {
          const d = new Date(s.data_venda);
          const hasItems = s.items && s.items.some(i => i.status === 'sold');
          return d >= sDate && d <= eDate && s.status !== 'cancelled' && hasItems;
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
      
      {/* Header com Seletor de Período Otimizado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">
             Relatório Gerencial
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">Análise cruzada de operação, financeiro e estoque.</p>
        </div>

        {/* Filtro de Período Tipo 'Range' Unificado */}
        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 ml-1">Selecionar Período de Análise</span>
          <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden divide-x divide-zinc-100 dark:divide-zinc-800 w-full md:w-auto transition-all">
            <div className="relative flex items-center px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
              <div className="text-zinc-400 mr-2 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"/>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-zinc-900 dark:text-white outline-none cursor-pointer"
              />
            </div>
            <div className="px-3 flex items-center justify-center text-zinc-300 dark:text-zinc-700">
               <ArrowRight size={14} />
            </div>
            <div className="relative flex items-center px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-zinc-900 dark:text-white outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

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
                  <ReportTooltip text="Dinheiro Retido: Entradas brutas teóricas baseadas no preço de venda original dos itens (sem descontos) que foram quitados no período, subtraídas do custo dessas peças." />
                </span>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400 dark:text-zinc-400">Custo Peças Vendidas:</span>
                      <span>{formatCurrency(kpis.totalCustoVendas)}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400 dark:text-zinc-400">Entrada Bruta Efetiva:</span>
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
                  <ReportTooltip text="Saldo Disponível: Valor líquido total de todos os recebíveis. Calculado como: Entrada Bruta - Descontos - Taxas." />
                </span>
                <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-600 dark:text-zinc-300 font-medium">Entrada Bruta Efetiva:</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{formatCurrency(kpis.totalVendaBrutaEfetiva)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Total Descontos (Rateado):</span>
                      <span className="text-zinc-600">-{formatCurrency(kpis.totalDiscountOverall)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Taxas Bancárias (Líquidas):</span>
                      <span className="text-zinc-500">-{formatCurrency(kpis.totalFees)}</span>
                    </div>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-zinc-800 dark:text-white">Receita Líquida Retida</span>
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
                  <ReportTooltip text="Operacional: Soma total dos valores de itens devolvidos ou cancelados no período. Esse valor sai da 'Receita Real' e entra aqui." />
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
                    <ReportTooltip text="Soma de todos os abatimentos (Item, Extra e Vale Presente) concedidos nas vendas liquidadas no período." />
                  </span>
                  
                  <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1 custom-scrollbar">
                    {Object.entries(kpis.discountsByMethod).map(([method, amount]: [string, number]) => (
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
                    <ReportTooltip text="Taxas bancárias efetivamente retidas pelas operadoras nos pagamentos liquidados." />
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
                      {formatCurrency(kpis.totalClientBalance)}
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
