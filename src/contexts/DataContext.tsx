import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { backendService } from '@/services/backendService';
import { Sale, ChartDataPoint, Client, Product, StockEntry, Supplier, UserProfile, PaymentDiscounts } from '@/types';
import { useAuth } from './AuthContext';
import { PaymentFees } from '@/services/backendService';

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
  paymentDiscounts: PaymentDiscounts | null;
  chartData: ChartDataPoint[];
  topBrand: string;
  favoriteIds: string[];
  toggleFavorite: (productId: string) => Promise<void>;
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
  const [paymentDiscounts, setPaymentDiscounts] = useState<PaymentDiscounts | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [topBrand, setTopBrand] = useState<string>('-');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isInitialLoadDone = useRef(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Função base que executa as queries sem retry
  const executeQueries = useCallback(async (): Promise<boolean> => {
    const timeoutPromise = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), 10000)
    );

    const fetchPromise = Promise.allSettled([
      session ? backendService.getRecentSales() : Promise.resolve([]),
      session ? backendService.getDashboardChartData() : Promise.resolve([]),
      session ? backendService.getClients() : Promise.resolve([]),
      backendService.getProducts(),
      session ? backendService.getStockEntries() : Promise.resolve([]),
      session ? backendService.getSuppliers() : Promise.resolve([]),
      session ? backendService.getTopSellingBrand() : Promise.resolve('-'),
      session ? backendService.getUsers() : Promise.resolve([]),
      session?.user ? backendService.getFavorites(session.user.id) : Promise.resolve([]),
      backendService.getPaymentFees(),
      backendService.getPaymentDiscounts()
    ]);

    const results = await Promise.race([fetchPromise, timeoutPromise]);

    // Timeout — queries ainda travadas
    if (results === null) return false;

    const [recentSales, dashboardChart, clientData, productData, stockData,
           supplierData, brand, usersData, favoritesData, feesData, discountsData] =
      results.map(r => r.status === 'fulfilled' ? r.value : null) as any;

    setSales(recentSales || []);
    setChartData(dashboardChart || []);
    setClients(clientData || []);
    setProducts(productData || []);
    setStockEntries(stockData || []);
    setSuppliers(supplierData || []);
    setTopBrand(brand || '-');
    setUsers(usersData || []);
    setFavoriteIds(favoritesData || []);
    setPaymentFees(feesData || null);
    setPaymentDiscounts(discountsData || null);
    setLastUpdated(new Date());
    return true;
  }, [session]);

  const refreshData = useCallback(async () => {
    // Cancela retry pendente se houver
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (!isInitialLoadDone.current) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      // Primeira tentativa
      const success = await executeQueries();

      if (!success) {
        // Queries travadas — aguarda 3s e tenta uma única vez mais
        console.log('[DataContext] Conexão indisponível — aguardando 3s para retry...');
        setIsRefreshing(false);
        setIsLoading(false);
        isInitialLoadDone.current = true;

        retryTimeoutRef.current = setTimeout(async () => {
          console.log('[DataContext] Retry...');
          setIsRefreshing(true);
          const retrySuccess = await executeQueries();
          if (!retrySuccess) {
            console.log('[DataContext] Retry falhou — conexão indisponível.');
          }
          setIsRefreshing(false);
        }, 3000);
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('[DataContext] Erro:', error);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isInitialLoadDone.current = true;
    }
  }, [executeQueries]);

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

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!session?.user) return;
    
    // Otimista
    const isCurrentlyFavorite = favoriteIds.includes(productId);
    setFavoriteIds(prev => 
      isCurrentlyFavorite 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );

    try {
      const success = await backendService.toggleFavorite(
        session.user.id, 
        productId, 
        session.user.user_metadata?.name || '', 
        session.user.email || ''
      );
      
      if (!success) {
        // Reverte se falhou
        setFavoriteIds(prev => 
          isCurrentlyFavorite 
            ? [...prev, productId]
            : prev.filter(id => id !== productId)
        );
      }
    } catch (error) {
      console.error('[DataContext] Erro ao alternar favorito:', error);
      // Reverte se falhou
      setFavoriteIds(prev => 
        isCurrentlyFavorite 
          ? [...prev, productId]
          : prev.filter(id => id !== productId)
      );
    }
  }, [session, favoriteIds]);

  // Busca inicial e quando a sessão muda
  useEffect(() => {
    refreshData();
  }, [refreshData, session]);

  // Ao voltar para a aba: aguarda 1s antes de tentar (deixa conexão se reestabelecer)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        // Cancela retry pendente para não duplicar
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        // Delay de 1s ao voltar para a aba
        setTimeout(() => refreshData(), 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, refreshData]);

  // Keep-alive a cada 4 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && session) {
        backendService.getPaymentFees();
      }
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Limpa retry ao desmontar
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  return (
    <DataContext.Provider value={{
      clients, products, sales, salesReport, receiptsReport,
      clientSales, clientStockHistory, stockEntries, suppliers,
      users, paymentFees, paymentDiscounts, chartData, topBrand,
      favoriteIds, toggleFavorite,
      isLoading, isRefreshing,
      refreshData, fetchSalesReport, fetchManagementReport, fetchClientHistory,
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