
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, User, Search, Menu, X, Settings, ChevronDown } from 'lucide-react';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
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
    {
      name: 'Novidades',
      path: '/',
      items: [{ name: 'Confira os lançamentos', path: '/' }]
    },
    {
      name: 'Coleções',
      path: '#',
      items: [
        { name: 'Primavera / Verão 2026', path: '/category/colecao-primavera' },
        { name: 'Outono / Inverno 2026', path: '/category/colecao-inverno' }
      ]
    },
    {
      name: 'Categorias',
      path: '#',
      items: [
        { name: 'Vestidos', path: '/category/vestidos' },
        { name: 'Blusas', path: '/category/blusas' },
        { name: 'Camisas', path: '/category/camisas' },
        { name: 'Calças', path: '/category/calcas' },
        { name: 'Saias', path: '/category/saias' },
        { name: 'Casacos', path: '/category/casacos' },
        { name: 'Jaquetas', path: '/category/jaquetas' },
        { name: 'Bermudas', path: '/category/bermudas' }
      ]
    },
    {
      name: 'Acessórios',
      path: '#',
      items: [
        { name: 'Pulseiras', path: '/category/pulseiras' },
        { name: 'Brincos', path: '/category/brincos' },
        { name: 'Colares', path: '/category/colares' }
      ]
    },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? 'bg-white/80 backdrop-blur-md shadow-sm h-16'
        : 'bg-transparent h-20'
        }`}
    >
      <div className="w-full h-full px-2 sm:px-6 flex items-center justify-between gap-4">
        {/* Mobile Toggle */}
        <button
          className="lg:hidden p-2 text-zinc-900"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={24} />
        </button>

        {/* Logo - Extreme Left */}
        <Link to="/" className="flex items-center gap-2 sm:gap-4 group shrink-0">
          <BrandLogo size="md" className="transition-transform group-hover:scale-110" />
          <span className="font-rouge text-xl sm:text-4xl hidden sm:block">Decoty Boutique</span>
        </Link>

        {/* Desktop Nav - Middle */}
        <div className="hidden lg:flex items-center gap-8 mx-auto h-full">
          {navLinks.map((link) => (
            <div
              key={link.name}
              className="relative h-full flex items-center group"
              onMouseEnter={() => setActiveDropdown(link.name)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors flex items-center gap-1 py-4"
              >
                {link.name}
                <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
              </button>

              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 w-64 bg-white/95 backdrop-blur-md border border-zinc-100 shadow-xl rounded-2xl p-4 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all z-50">
                <div className="grid grid-cols-1 gap-2">
                  {link.items.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      className="text-sm text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 p-2 rounded-xl transition-all"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>

              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-zinc-900 transition-all group-hover:w-full" />
            </div>
          ))}
        </div>

        {/* Actions - Extreme Right */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Rounded Search Box */}
          <div className="hidden md:flex items-center bg-zinc-100/80 backdrop-blur-sm border border-zinc-200 rounded-full px-4 py-2 w-48 lg:w-80 group focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
            <Search size={18} className="text-zinc-400 group-focus-within:text-zinc-900" />
            <input
              type="text"
              placeholder="Qual peça está procurando?"
              className="bg-transparent border-none outline-none text-xs ml-2 w-full text-zinc-900 placeholder:text-zinc-400 font-medium"
            />
          </div>

          <Link
            to={user ? "/my-account" : "/entrar"}
            className="p-2 text-zinc-600 hover:text-zinc-950 transition-colors flex items-center gap-2"
          >
            <User size={20} />
            <span className="hidden xl:inline text-xs font-semibold uppercase tracking-wider">
              {user ? 'Minha Conta' : 'Entrar'}
            </span>
          </Link>

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

              <div className="flex flex-col gap-8 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
                {navLinks.map((link) => (
                  <div key={link.name} className="flex flex-col gap-4">
                    <h4 className="text-lg font-serif text-zinc-900 border-b border-zinc-100 pb-2 flex items-center justify-between">
                      {link.name}
                    </h4>
                    <div className="flex flex-col gap-3 pl-4">
                      {link.items.map((item) => (
                        <Link
                          key={item.name}
                          to={item.path}
                          className="text-base text-zinc-500 hover:text-zinc-950 transition-colors"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-10 left-6 right-6">
                {!user && (
                  <Link to="/entrar" className="block w-full text-center py-3 bg-zinc-900 text-white rounded-xl font-bold">
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
