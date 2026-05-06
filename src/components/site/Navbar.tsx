
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, User, Search, Menu, X, Settings } from 'lucide-react';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, userRole } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fechar menu mobile ao trocar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Novidades', path: '/' },
    { name: 'Vestidos', path: '/category/vestidos' },
    { name: 'Blusas', path: '/category/blusas' },
    { name: 'Acessórios', path: '/category/acessorios' },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/80 backdrop-blur-md shadow-sm h-16' 
          : 'bg-transparent h-20'
      }`}
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Mobile Toggle */}
        <button 
          className="lg:hidden p-2 text-zinc-900"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={24} />
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <BrandLogo size="md" className="transition-transform group-hover:scale-110" />
          <span className="font-rouge text-xl sm:text-2xl hidden sm:block">Decoty Boutique</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.path}
              to={link.path}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors relative group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-zinc-900 transition-all group-hover:w-full" />
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button className="p-2 text-zinc-600 hover:text-zinc-950 transition-colors">
            <Search size={20} />
          </button>
          
          <Link 
            to={user ? "/my-account" : "/login"} 
            className="p-2 text-zinc-600 hover:text-zinc-950 transition-colors flex items-center gap-2"
          >
            <User size={20} />
            <span className="hidden md:inline text-xs font-semibold uppercase tracking-wider">
              {user ? 'Minha Conta' : 'Login'}
            </span>
          </Link>

          {/* ERP Access for staff */}
          {user && (userRole === 'manager' || userRole === 'salesperson') && (
            <Link 
              to="/erp/home" 
              className="p-2 text-zinc-600 hover:text-zinc-950 transition-colors hidden sm:block"
              title="Acessar ERP"
            >
              <Settings size={20} />
            </Link>
          )}

          <button className="p-2 text-zinc-600 hover:text-zinc-950 transition-colors relative">
            <ShoppingBag size={20} />
            <span className="absolute -top-1 -right-1 bg-zinc-900 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              0
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white z-[70] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <BrandLogo size="md" />
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {navLinks.map((link) => (
                  <Link 
                    key={link.path}
                    to={link.path}
                    className="text-lg font-medium text-zinc-900 hover:text-zinc-500 transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              <div className="absolute bottom-10 left-6 right-6">
                {!user && (
                   <Link to="/login" className="block w-full text-center py-3 bg-zinc-900 text-white rounded-xl font-bold">
                    Entrar na Conta
                   </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};
