import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import { Plus, UserPlus, Package, Archive, ShoppingCart, Users, PieChart, Truck } from 'lucide-react';
import { mockService } from './services/mockService';
import { Sale, ChartDataPoint, Client, Product, StockEntry, Supplier } from './types';
import { Button } from './components/ui/Button';
import { NewSaleModal } from './components/NewSaleModal';
import { ClientList } from './components/ClientList';
import { ProductList } from './components/ProductList';
import { StockList } from './components/StockList';
import { SalesPage } from './components/SalesPage';
import { UserMenu } from './components/UserMenu';
import { DashboardHome } from './components/DashboardHome';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { TeamList } from './components/TeamList';
import { SettingsPage } from './components/SettingsPage';
import { ManagementReportPage } from './components/ManagementReportPage';
import { ClientHistoryPage } from './components/ClientHistoryPage';
import { SupplierList } from './components/SupplierList';

// Função para obter o tema inicial
const getInitialTheme = (): boolean => {
  // Se estiver no navegador
  if (typeof window !== 'undefined') {
    // Tenta recuperar do localStorage
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      return savedTheme === 'true';
    }
    
    // Se não tiver no localStorage, verifica a preferência do sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  // Valor padrão para SSR
  return false;
};

// Custom Luxury Logo Component - "D" in Rouge Script
const BrandLogo = () => (
  <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-zinc-900 dark:bg-zinc-100 shadow-md transition-colors duration-300">
    <span className="font-rouge text-4xl text-white dark:text-zinc-900 pt-1 select-none">D</span>
  </div>
);

// Wrapper para Rotas Exclusivas de Gerente
const ManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userRole } = useAuth();
  if (userRole !== 'manager') {
    return <Navigate to="/home" replace />;
  }
  return <>{children}</>;
};

// Layout Component for Authenticated Pages
const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth(); 
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => getInitialTheme());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isManager = userRole === 'manager';

  // Data States
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [topBrand, setTopBrand] = useState<string>('-');

  // Theme Logic
  useEffect(() => {
    console.log('Tema atualizado:', isDarkMode ? 'escuro' : 'claro');
    
    // Aplicar/remover a classe dark no html
    if (isDarkMode) {
      console.log('Aplicando classe dark ao documento');
      document.documentElement.classList.add('dark');
    } else {
      console.log('Removendo classe dark do documento');
      document.documentElement.classList.remove('dark');
    }
    
    // Salvar preferência no localStorage
    if (typeof window !== 'undefined') {
      console.log('Salvando preferência no localStorage:', isDarkMode);
      localStorage.setItem('darkMode', String(isDarkMode));
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    console.log('Alternando tema...');
    setIsDarkMode(prev => {
      console.log('Estado anterior do tema:', prev ? 'escuro' : 'claro');
      return !prev;
    });
  };

  // Data Fetching
  const fetchDashboardData = useCallback(async () => {
    try {
      const [sales, chart, clientData, productData, stockData, supplierData, brand] = await Promise.all([
        mockService.getRecentSales(),
        mockService.getDashboardChartData(),
        mockService.getClients(),
        mockService.getProducts(),
        mockService.getStockEntries(),
        mockService.getSuppliers(),
        mockService.getTopSellingBrand()
      ]);
      setRecentSales(sales);
      setChartData(chart);
      setClients(clientData);
      setProducts(productData);
      setStockEntries(stockData);
      setSuppliers(supplierData);
      setTopBrand(brand);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Função para navegar e atualizar simultaneamente
  const navigateWithRefresh = (path: string) => {
    navigate(path);
    fetchDashboardData();
  };

  // Derived Calculations
  const totalPeriodSales = chartData.reduce((acc, curr) => acc + curr.total, 0);
  const todaySales = chartData.length > 0 ? chartData[chartData.length - 1].total : 0;
  const dailyAverage = totalPeriodSales / 7;

  const isActive = (path: string) => location.pathname.startsWith(path);

  const LoadingScreen = () => (
    <div className="h-64 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
      Carregando...
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30 transition-colors duration-300 shadow-sm">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => navigateWithRefresh('/home')}
          >
            <div className="transform group-hover:scale-105 transition-transform duration-300">
              <BrandLogo />
            </div>
            <h1 className="text-4xl font-rouge text-zinc-900 dark:text-white tracking-wide pt-2">
              Decoty Boutique
            </h1>
          </div>
          
          <UserMenu isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        </div>
      </header>

      <main className="flex-1 w-full max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Navigation Action Bar */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 ${isManager ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4`}>
           <Button 
            variant="success"
            className="h-auto py-3 flex flex-col items-center gap-2 border-0 col-span-2 sm:col-span-1"
            onClick={() => setIsModalOpen(true)}
          >
            <ShoppingCart size={24} />
            <span>Realizar Venda</span>
          </Button>

          <Button 
            variant={isActive('/products') ? 'primary' : 'secondary'} 
            className={`h-auto py-3 flex flex-col items-center gap-2 transition-all shadow-sm
              ${!isActive('/products') 
                ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700' 
                : 'border-0'
              }`}
            onClick={() => navigateWithRefresh('/products')}
          >
            <Package size={24} />
            <span>Produtos</span>
          </Button>

          <Button 
            variant={isActive('/stock') ? 'primary' : 'secondary'} 
            className={`h-auto py-3 flex flex-col items-center gap-2 transition-all shadow-sm
              ${!isActive('/stock') 
                ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700' 
                : 'border-0'
              }`}
            onClick={() => navigateWithRefresh('/stock')}
          >
            <Archive size={24} />
            <span>Estoque</span>
          </Button>

          <Button 
            variant={isActive('/clients') ? 'primary' : 'secondary'} 
            className={`h-auto py-3 flex flex-col items-center gap-2 transition-all shadow-sm
              ${!isActive('/clients') 
                ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700' 
                : 'border-0'
              }`}
            onClick={() => navigateWithRefresh('/clients')}
          >
            <Users size={24} />
            <span>Clientes</span>
          </Button>

          <Button 
            variant={isActive('/suppliers') ? 'primary' : 'secondary'} 
            className={`h-auto py-3 flex flex-col items-center gap-2 transition-all shadow-sm
              ${!isActive('/suppliers') 
                ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700' 
                : 'border-0'
              }`}
            onClick={() => navigateWithRefresh('/suppliers')}
          >
            <Truck size={24} />
            <span>Fornecedores</span>
          </Button>

          {isManager && (
            <Button 
              variant={isActive('/reports') ? 'primary' : 'secondary'} 
              className={`h-auto py-3 flex flex-col items-center gap-2 transition-all shadow-sm
                ${!isActive('/reports') 
                  ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700' 
                  : 'border-0'
                }`}
              onClick={() => navigateWithRefresh('/reports')}
            >
              <PieChart size={24} />
              <span>Relatórios</span>
            </Button>
          )}
        </div>

        {isLoading ? (
          <LoadingScreen />
        ) : (
          <Routes>
             <Route path="/home" element={
              <DashboardHome 
                totalPeriodSales={totalPeriodSales}
                dailyAverage={dailyAverage}
                todaySales={todaySales}
                topBrand={topBrand}
                chartData={chartData}
                recentSales={recentSales}
                isDarkMode={isDarkMode}
                onOpenReport={() => navigateWithRefresh('/sales')}
                onRefresh={fetchDashboardData}
              />
            } />
            
            <Route path="/clients" element={<ClientList clients={clients} onUpdate={fetchDashboardData} />} />
            <Route path="/clients/:clientId/history" element={<ClientHistoryPage onUpdate={fetchDashboardData} />} />
            <Route path="/suppliers" element={<SupplierList suppliers={suppliers} onUpdate={fetchDashboardData} />} />
            
            <Route path="/products" element={<ProductList products={products} onUpdate={fetchDashboardData} />} />
            <Route path="/stock" element={<StockList entries={stockEntries} products={products} onUpdate={fetchDashboardData} />} />

            <Route path="/sales" element={<ManagerRoute><SalesPage onUpdate={fetchDashboardData} /></ManagerRoute>} />
            <Route path="/team" element={<ManagerRoute><TeamList /></ManagerRoute>} />
            <Route path="/settings" element={<ManagerRoute><SettingsPage /></ManagerRoute>} />
            <Route path="/reports" element={<ManagerRoute><ManagementReportPage /></ManagerRoute>} />
          </Routes>
        )}
      </main>

      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-6 mt-auto transition-colors duration-300">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <p>&copy; {new Date().getFullYear()} Decoty Boutique. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors">Termos de Uso</span>
            <span className="hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors">Suporte</span>
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-400 dark:text-zinc-500">v1.3.0</span>
          </div>
        </div>
      </footer>

      <NewSaleModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSaleComplete={fetchDashboardData}
      />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
       <Routes>
         <Route path="/login" element={<LoginPage />} />
         <Route path="/register" element={<RegisterPage />} />

         <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={null} />
            <Route path="*" element={<Navigate to="/home" replace />} />
         </Route>
       </Routes>
    </AuthProvider>
  );
};

export default App;