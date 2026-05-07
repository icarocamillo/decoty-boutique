
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
      path: '/catalogo',
      items: [
        { name: 'Confira os lançamentos', path: '/catalogo?sort=newest' },
        { name: 'Ver Tudo', path: '/catalogo' }
      ]
    },
    {
      name: 'Coleções',
      path: '/catalogo',
      items: [
        { name: 'Primavera / Verão 2026', path: '/catalogo?collection=primavera' },
        { name: 'Outono / Inverno 2026', path: '/catalogo?collection=inverno' }
      ]
    },
    {
      name: 'Categorias',
      path: '/catalogo',
      items: [
        { name: 'Vestidos', path: '/catalogo?category=Vestidos' },
        { name: 'Blusas', path: '/catalogo?category=Blusas' },
        { name: 'Camisas', path: '/catalogo?category=Camisas' },
        { name: 'Calças', path: '/catalogo?category=Calcas' },
        { name: 'Saias', path: '/catalogo?category=Saias' },
        { name: 'Casacos', path: '/catalogo?category=Casacos' },
        { name: 'Jaquetas', path: '/catalogo?category=Jaquetas' },
        { name: 'Bermudas', path: '/catalogo?category=Bermudas' }
      ]
    },
    {
      name: 'Acessórios',
      path: '/catalogo',
      items: [
        { name: 'Pulseiras', path: '/catalogo?category=Pulseiras' },
        { name: 'Brincos', path: '/catalogo?category=Brincos' },
        { name: 'Colares', path: '/catalogo?category=Colares' }
      ]
    },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
          ? 'bg-white/40 backdrop-blur-lg shadow-sm h-16'
          : 'bg-transparent h-20'
          }`}
      >
      <div className="w-full h-full px-4 sm:px-6 flex items-center relative">
        {/* Left Section: Mobile Toggle or Desktop Logo */}
        <div className="flex-1 flex items-center">
          <button
            className="md:hidden p-2 -ml-2 text-zinc-900"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
 
          <div className="hidden md:flex">
            <Link to="/" className="flex items-center gap-3 xl:gap-4 group shrink-0">
              <BrandLogo size="md" className="transition-transform group-hover:scale-110" />
              <span className="font-rouge text-xl xl:text-4xl hidden md:block">
                <span className="xl:inline hidden">Decoty Boutique</span>
                <span className="xl:hidden inline text-2xl">Decoty</span>
              </span>
            </Link>
          </div>
        </div>

        {/* Middle Section: Centered Logo on Mobile, Nav Links on Desktop/Tablet */}
        <div className="flex-shrink-0 flex items-center justify-center">
          {/* Logo - Centered on mobile ONLY */}
          <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            <Link to="/" className="group">
              <BrandLogo size="md" className="transition-transform group-hover:scale-110" />
            </Link>
          </div>

          {/* Desktop/Tablet Nav */}
          <div className="hidden md:flex items-center gap-4 xl:gap-8 h-full">
            {navLinks.map((link) => (
              <div
                key={link.name}
                className="relative h-full flex items-center group"
                onMouseEnter={() => setActiveDropdown(link.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className="text-[13px] xl:text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors flex items-center gap-1 py-4"
                >
                  {link.name}
                  <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
                </button>

                {/* Dropdown Menu */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-64 bg-white/95 backdrop-blur-md border border-zinc-100 shadow-xl rounded-2xl p-4 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all z-50">
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
        </div>

        {/* Right Section: Actions */}
        <div className="flex-1 flex items-center justify-end gap-1 sm:gap-3 xl:gap-4 shrink-0">
          {/* Mobile/Tablet Search Icon */}
          <button className="xl:hidden p-2 text-zinc-600 hover:text-zinc-950 transition-colors">
            <Search size={20} />
          </button>

          {/* Rounded Search Box - Visible from xl up */}
          <div className="hidden xl:flex items-center bg-zinc-100/80 backdrop-blur-sm border border-zinc-200 rounded-full px-4 py-2 xl:w-80 group focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
            <Search size={18} className="text-zinc-400 group-focus-within:text-zinc-900 shrink-0" />
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

    </nav>
    
    {/* Mobile Menu Overlay */}
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-80 bg-white z-[110] p-6 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between mb-8 shrink-0">
              <div className="flex items-center gap-3">
                <BrandLogo size="md" />
                <span className="font-rouge text-2xl text-zinc-900">Decoty Boutique</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-2 text-zinc-900">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar">
              {navLinks.map((link) => (
                <div key={link.name} className="flex flex-col gap-4">
                  <h4 className="text-lg font-serif text-zinc-900 border-b border-zinc-100 pb-2">
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

            <div className="mt-auto pt-6 border-t border-zinc-100">
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
    </>
  );
};
