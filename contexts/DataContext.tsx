import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { backendService } from '../services/backendService';
import { Sale, ChartDataPoint, Client, Product, StockEntry, Supplier, UserProfile } from '../types';
import { useAuth } from './AuthContext';
import { PaymentFees } from '../services/backendService';

interface DataContextType {
  clients: Client[];
  products: Product[];
  sales: Sale[];
  salesReport: Sale[];
  receiptsReport: any[];
  clientSales: Sale[];
  clientStockHistory: StockEntry[];
  stockEntries: StockEntry[];
  suppliers: Supplier[];
  users: UserProfile[];
  paymentFees: PaymentFees | null;
  chartData: ChartDataPoint[];
  topBrand: string;
  isLoading: boolean;
  isRefreshing: boolean;
  refreshData: () => Promise<void>;
  fetchSalesReport: (startDate: string, endDate: string) => Promise<void>;
  fetchManagementReport: (startDate: string, endDate: string) => Promise<void>;
  fetchClientHistory: (clientId: string) => Promise<void>;
  lastUpdated: Date | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesReport, setSalesReport] = useState<Sale[]>([]);
  const [receiptsReport, setReceiptsReport] = useState<any[]>([]);
  const [clientSales, setClientSales] = useState<Sale[]>([]);
  const [clientStockHistory, setClientStockHistory] = useState<StockEntry[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [paymentFees, setPaymentFees] = useState<PaymentFees | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [topBrand, setTopBrand] = useState<string>('-');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isInitialLoadDone = useRef(false);
  // Referência ao AbortController ativo — cancelamos ao sair da aba
  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshData = useCallback(async () => {
    // Cancela fetch anterior se ainda estiver pendente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!isInitialLoadDone.current) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const [
        recentSales,
        dashboardChart,
        clientData,
        productData,
        stockData,
        supplierData,
        brand,
        usersData,
        feesData
      ] = await Promise.all([
        backendService.getRecentSales(),
        backendService.getDashboardChartData(),
        backendService.getClients(),
        backendService.getProducts(),
        backendService.getStockEntries(),
        backendService.getSuppliers(),
        backendService.getTopSellingBrand(),
        backendService.getUsers(),
        backendService.getPaymentFees()
      ]);

      setSales(recentSales);
      setChartData(dashboardChart);
      setClients(clientData);
      setProducts(productData);
      setStockEntries(stockData);
      setSuppliers(supplierData);
      setTopBrand(brand);
      setUsers(usersData);
      setPaymentFees(feesData);
      setLastUpdated(new Date());
    } catch (error: any) {
      // AbortError é intencional — não logar como erro
      if (error?.name !== 'AbortError') {
        console.error('[DataContext] Erro ao buscar dados globais:', error);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isInitialLoadDone.current = true;
    }
  }, []);

  const fetchSalesReport = useCallback(async (startDate: string, endDate: string) => {
    setIsRefreshing(true);
    try {
      const data = await backendService.getSalesByPeriod(startDate, endDate);
      setSalesReport(data);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('[DataContext] Erro ao buscar relatório de vendas:', error);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const fetchManagementReport = useCallback(async (startDate: string, endDate: string) => {
    setIsRefreshing(true);
    try {
      const historyStart = new Date(startDate);
      historyStart.setMonth(historyStart.getMonth() - 12);
      const historyStartStr = historyStart.toISOString().split('T')[0];

      const [salesData, receiptsData] = await Promise.all([
        backendService.getSalesByPeriod(historyStartStr, endDate),
        backendService.getReceiptsByPeriod(historyStartStr, endDate)
      ]);

      setSalesReport(salesData);
      setReceiptsReport(receiptsData);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('[DataContext] Erro ao buscar relatório gerencial:', error);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const fetchClientHistory = useCallback(async (clientId: string) => {
    setIsRefreshing(true);
    try {
      const [allSales, clientStock] = await Promise.all([
        backendService.getClientSales(clientId),
        backendService.getClientStockHistory(clientId)
      ]);
      setClientSales(allSales);
      setClientStockHistory(clientStock);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('[DataContext] Erro ao buscar histórico do cliente:', error);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Busca inicial quando a sessão está pronta
  useEffect(() => {
    if (session) {
      refreshData();
    }
  }, [session, refreshData]);

  // Gerencia ciclo de vida da aba:
  // - Ao sair: cancela queries pendentes (evita zumbis que nunca resolvem)
  // - Ao voltar: inicia novo fetch com dados frescos
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setIsRefreshing(false);
      } else if (document.visibilityState === 'visible' && session) {
        refreshData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, refreshData]);

  // Keep-alive a cada 4 minutos para evitar idle do Supabase Free tier
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && session) {
        backendService.getPaymentFees(); // query leve, mantém conexão viva
      }
    }, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <DataContext.Provider value={{
      clients,
      products,
      sales,
      salesReport,
      receiptsReport,
      clientSales,
      clientStockHistory,
      stockEntries,
      suppliers,
      users,
      paymentFees,
      chartData,
      topBrand,
      isLoading,
      isRefreshing,
      refreshData,
      fetchSalesReport,
      fetchManagementReport,
      fetchClientHistory,
      lastUpdated
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData deve ser usado dentro de um DataProvider');
  }
  return context;
};