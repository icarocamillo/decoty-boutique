import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, Archive, ShoppingCart, Users, PieChart, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UserMenu } from '@/components/shared/UserMenu';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { NewSaleModal } from '@/components/erp/NewSaleModal';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

interface ErpLayoutProps {
  children: React.ReactNode;
}

const getInitialTheme = (): boolean => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) return savedTheme === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

export const ErpLayout: React.FC<ErpLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();
  const { isLoading, isRefreshing, refreshData } = useData();

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => getInitialTheme());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isManager = userRole === 'manager';

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    if (typeof window !== 'undefined') localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  const isActive = (path: string) => location.pathname.startsWith(path);

  const LoadingScreen = () => (
    <div className="h-64 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
      Carregando...
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col transition-colors duration-300">
      <div
        className={`fixed top-0 left-0 right-0 z-50 h-0.5 bg-emerald-500 transition-all duration-500 ${isRefreshing ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: isRefreshing ? 'scaleX(0.9)' : 'scaleX(1)', transformOrigin: 'left' }}
      />

      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30 transition-colors duration-300 shadow-sm">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div
            className="flex items-center gap-5 cursor-pointer group h-full"
            onClick={() => navigate('/erp/home')}
          >
            <div className="transform group-hover:scale-105 transition-transform duration-300 flex items-center h-full">
              <BrandLogo size="xl" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-rouge text-zinc-900 dark:text-white tracking-wide pt-1">
              Decoty Boutique
            </h1>
          </div>
          <UserMenu isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        </div>
      </header>

      <main className="flex-1 w-full max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
            variant={isActive('/erp/products') ? 'primary' : 'secondary'}
            className={`h-auto py-3 flex flex-col items-center gap-2 transition-all shadow-sm ${!isActive('/erp/products') ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700' : 'border-0'}`}
            onClick={() => navigate('/erp/products')}
          >
            <Package size={24} />
            <span>Produtos</span>
          </Button>

          <Button
            variant={isActive('/erp/stock') ? 'primary' : 'secondary'}
            className={`h-auto py-3 flex flex-col items-center gap-2 transition-all shadow-sm ${!isActive('/erp/stock') ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700' : 'border-0'}`}
            onClick={() => navigate('/erp/stock')}
          >
            <Archive size={24} />
            <span>Estoque</span>
          </Button>

          <Button
            variant={isActive('/erp/clients') ? 'primary' : 'secondary'}
            className={`h-auto py-3 flex flex-col items-center gap-2 transition-all shadow-sm ${!isActive('/erp/clients') ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700' : 'border-0'}`}
            onClick={() => navigate('/erp/clients')}
          >
            <Users size={24} />
            <span>Clientes</span>
          </Button>

          <Button
            variant={isActive('/erp/suppliers') ? 'primary' : 'secondary'}
            className={`h-auto py-3 flex flex-col items-center gap-2 transition-all shadow-sm ${!isActive('/erp/suppliers') ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700' : 'border-0'}`}
            onClick={() => navigate('/erp/suppliers')}
          >
            <Truck size={24} />
            <span>Fornecedores</span>
          </Button>

          {isManager && (
            <Button
              variant={isActive('/erp/reports') ? 'primary' : 'secondary'}
              className={`h-auto py-3 flex flex-col items-center gap-2 transition-all shadow-sm ${!isActive('/erp/reports') ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700' : 'border-0'}`}
              onClick={() => navigate('/erp/reports')}
            >
              <PieChart size={24} />
              <span>Relatórios</span>
            </Button>
          )}
        </div>

        {isLoading ? (
          <LoadingScreen />
        ) : (
          children
        )}
      </main>

      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-6 mt-auto transition-colors duration-300">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <p>&copy; {new Date().getFullYear()} Decoty Boutique. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors">Termos de Uso</span>
            <span className="hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors">Suporte</span>
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-400 dark:text-zinc-500">v1.3.2</span>
          </div>
        </div>
      </footer>

      <NewSaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaleComplete={refreshData}
      />
    </div>
  );
};
