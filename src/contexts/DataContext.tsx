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
  toggleFavorite: (productId: string, color?: string) => Promise<void>;
  isLoading: boolean;
  isRefreshing: boolean;
  refreshData: () => Promise<void>;
  fetchSalesReport: (startDate: string, endDate: string) => Promise<void>;
  fetchManagementReport: (startDate: string, endDate: string) => Promise<void>;
  fetchClientHistory: (clientId: string) => Promise<void>;
  lastUpdated: Date | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const sameContent = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Devolve `prev` quando o conteúdo recém-buscado é igual ao que já está na tela e, em listas
 * de registros com `id`, reaproveita o objeto anterior de cada registro que não mudou.
 *
 * Por quê: toda recarga (ao voltar para a aba, depois de uma ação) trocava as listas por
 * objetos novos, mesmo sem nenhuma mudança no banco. Telas que montam o formulário a partir
 * de um registro (edição de produto, de fornecedor) reiniciavam e apagavam o que estava sendo
 * digitado. Com as referências estáveis, só o registro que realmente mudou dispara atualização.
 */
function reuseUnchanged<T>(prev: T, next: T): T {
  if (prev === next) return prev;

  if (Array.isArray(prev) && Array.isArray(next)) {
    const idOf = (item: unknown) =>
      item !== null && typeof item === 'object' ? (item as { id?: unknown }).id : undefined;

    const prevById = new Map<unknown, unknown>();
    for (const item of prev) {
      const id = idOf(item);
      if (id === undefined || id === null || prevById.has(id)) {
        // Lista sem identificador único por item: compara o conjunto inteiro.
        return sameContent(prev, next) ? prev : next;
      }
      prevById.set(id, item);
    }

    let unchanged = prev.length === next.length;
    const merged = next.map((item, index) => {
      const previous = prevById.get(idOf(item));
      if (previous !== undefined && sameContent(previous, item)) {
        if (prev[index] !== previous) unchanged = false;
        return previous;
      }
      unchanged = false;
      return item;
    });
    return (unchanged ? prev : merged) as T;
  }

  return sameContent(prev, next) ? prev : next;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, user } = useAuth();
  // Identificador estável do usuário logado. O objeto `session` é trocado a cada renovação de
  // token; depender dele recarregava todos os dados sem que nada tivesse mudado.
  const userId = session?.user?.id ?? null;
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
  // Número da recarga mais recente. Só ela grava o resultado: uma recarga antiga que termina
  // depois (rede lenta, ou iniciada antes de um logout) não sobrescreve os dados atuais.
  const querySeqRef = useRef(0);

  // Função base que executa as queries sem retry
  const executeQueries = useCallback(async (): Promise<boolean> => {
    const seq = ++querySeqRef.current;
    const timeoutPromise = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), 10000)
    );

    const fetchPromise = Promise.allSettled([
      userId ? backendService.getRecentSales() : Promise.resolve([]),
      userId ? backendService.getDashboardChartData() : Promise.resolve([]),
      userId ? backendService.getClients() : Promise.resolve([]),
      backendService.getProducts(),
      userId ? backendService.getStockEntries() : Promise.resolve([]),
      backendService.getSuppliers(),
      userId ? backendService.getTopSellingBrand() : Promise.resolve('-'),
      userId ? backendService.getUsers() : Promise.resolve([]),
      userId ? backendService.getFavorites(userId) : Promise.resolve([]),
      backendService.getPaymentFees(),
      backendService.getPaymentDiscounts()
    ]);

    const results = await Promise.race([fetchPromise, timeoutPromise]);

    // Timeout — queries ainda travadas
    if (results === null) return false;

    // Uma recarga mais nova já começou (ou o usuário mudou): descarta este resultado.
    if (seq !== querySeqRef.current) return true;

    const [recentSales, dashboardChart, clientData, productData, stockData,
           supplierData, brand, usersData, favoritesData, feesData, discountsData] =
      results.map(r => r.status === 'fulfilled' ? r.value : null) as any;

    // Mantém as referências do que não mudou (ver reuseUnchanged).
    setSales(prev => reuseUnchanged(prev, recentSales || []));
    setChartData(prev => reuseUnchanged(prev, dashboardChart || []));
    setClients(prev => reuseUnchanged(prev, clientData || []));
    setProducts(prev => reuseUnchanged(prev, productData || []));
    setStockEntries(prev => reuseUnchanged(prev, stockData || []));
    setSuppliers(prev => reuseUnchanged(prev, supplierData || []));
    setTopBrand(brand || '-');
    setUsers(prev => reuseUnchanged(prev, usersData || []));
    setFavoriteIds(prev => reuseUnchanged(prev, favoritesData || []));
    setPaymentFees(prev => reuseUnchanged(prev, feesData || null));
    setPaymentDiscounts(prev => reuseUnchanged(prev, discountsData || null));
    setLastUpdated(new Date());
    return true;
  }, [userId]);

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

  const toggleFavorite = useCallback(async (productId: string, color?: string) => {
    if (!user) return;
    
    // Otimista
    const favKey = color ? `${productId}:${color}` : productId;
    const isCurrentlyFavorite = favoriteIds.includes(favKey);
    setFavoriteIds(prev => 
      isCurrentlyFavorite 
        ? prev.filter(id => id !== favKey) 
        : [...prev, favKey]
    );

    try {
      const success = await backendService.toggleFavorite(
        user.id, 
        productId, 
        user.user_metadata?.name || '', 
        user.email || '',
        color
      );
      
      if (!success) {
        // Reverte se falhou
        setFavoriteIds(prev => 
          isCurrentlyFavorite 
            ? [...prev, favKey]
            : prev.filter(id => id !== favKey)
        );
      }
    } catch (error) {
      console.error('[DataContext] Erro ao alternar favorito:', error);
      // Reverte se falhou
      setFavoriteIds(prev => 
        isCurrentlyFavorite 
          ? [...prev, favKey]
          : prev.filter(id => id !== favKey)
      );
    }
  }, [user, favoriteIds]);

  // Busca inicial e quando o usuário muda (login, logout ou troca de conta).
  // `refreshData` só muda de identidade quando `userId` muda.
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Os favoritos são de quem está logado: ao trocar de usuário, saem da tela na hora,
  // sem esperar a recarga terminar.
  useEffect(() => {
    setFavoriteIds(prev => (prev.length ? [] : prev));
  }, [userId]);

  // Ao voltar para a aba: aguarda 1s antes de recarregar (dá tempo de a rede voltar depois de
  // uma suspensão; uma consulta que falha devolve lista vazia e apagaria o que está na tela).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        // Cancela retry pendente para não duplicar
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          refreshData();
        }, 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timer) clearTimeout(timer);
    };
  }, [userId, refreshData]);

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