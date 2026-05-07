
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ShoppingBag, User, Search, Menu, X, Settings, ChevronDown, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isPDP = location.pathname.startsWith('/produto/');
  const { user, userRole } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fechar menu mobile e busca ao trocar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/catalogo?search=${encodeURIComponent(searchTerm.trim())}`);
      setIsSearchOpen(false);
      setSearchTerm('');
    }
  };

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

  const bgColor = isPDP
    ? 'bg-zinc-950/80 backdrop-blur-md shadow-lg'
    : (isScrolled ? 'bg-white/40 backdrop-blur-lg shadow-sm' : 'bg-transparent');

  const textColor = isPDP ? 'text-white' : 'text-zinc-900';
  const subTextColor = isPDP ? 'text-white/60 hover:text-white' : 'text-zinc-600 hover:text-zinc-950';

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${bgColor} ${isScrolled ? 'h-16' : 'h-20'}`}
      >
        <div className="w-full h-full px-4 sm:px-6 flex items-center relative">
          {/* Left Section: Mobile Toggle or Desktop Logo */}
          <div className="flex-1 flex items-center">
            <button
              className={`md:hidden p-2 -ml-2 ${textColor} flex items-center gap-2`}
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
              <span className="text-[10px] uppercase font-black tracking-widest">Menu</span>
            </button>

            <div className="hidden md:flex">
              <Link to="/" className="flex items-center gap-3 xl:gap-4 group shrink-0">
                <BrandLogo size="md" className="transition-transform group-hover:scale-110" />
                <span className={`font-rouge text-xl xl:text-4xl hidden md:block ${textColor}`}>
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
                    className={`text-[13px] xl:text-sm font-medium transition-colors flex items-center gap-1 py-4 ${subTextColor}`}
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

                  <span className={`absolute -bottom-1 left-0 w-0 h-0.5 transition-all group-hover:w-full ${isPDP ? 'bg-white' : 'bg-zinc-900'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Right Section: Actions */}
          <div className="flex-1 flex items-center justify-end gap-1 sm:gap-3 xl:gap-4 shrink-0">
            {/* Mobile/Tablet Search Icon */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`xl:hidden p-2 transition-colors ${subTextColor}`}
            >
              <Search size={20} />
            </button>

            {/* Rounded Search Box - Visible from xl up */}
            <form
              onSubmit={handleSearch}
              className={`hidden xl:flex items-center backdrop-blur-sm border rounded-full px-4 py-2 xl:w-64 xl:ml-8 group transition-all ${isPDP
                  ? 'bg-white/10 border-white/20 focus-within:ring-white/30 focus-within:ring-2'
                  : 'bg-zinc-100/80 border-zinc-200 focus-within:ring-2 focus-within:ring-zinc-900'
                }`}
            >
              <Search size={18} className={`shrink-0 ${isPDP ? 'text-white/40 group-focus-within:text-white' : 'text-zinc-400 group-focus-within:text-zinc-900'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Qual peça está procurando?"
                className={`bg-transparent border-none outline-none text-xs ml-2 w-full font-medium ${isPDP ? 'text-white placeholder:text-white/30' : 'text-zinc-900 placeholder:text-zinc-400'
                  }`}
              />
            </form>

            <Link
              to={user ? "/my-account" : "/entrar"}
              className={`p-2 transition-colors flex items-center gap-2 ${subTextColor}`}
            >
              <User size={20} />
              <span className="hidden xl:inline text-xs font-semibold uppercase tracking-wider">
                {user ? 'Minha Conta' : 'Entrar'}
              </span>
            </Link>

            <button className={`p-2 transition-colors relative ${subTextColor}`}>
              <ShoppingBag size={20} />
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                0
              </span>
            </button>
          </div>
        </div>

      </nav>

      {/* Mobile/Tablet Search Bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="xl:hidden fixed top-[64px] left-0 right-0 bg-white/40 backdrop-blur-lg border-b border-zinc-100 z-40 overflow-hidden shadow-lg"
          >
            <div className="px-4 py-4 max-w-2xl mx-auto">
              <form onSubmit={handleSearch} className="relative flex items-center bg-zinc-100/40 backdrop-blur-md rounded-2xl px-4 py-3 border border-zinc-200/50 group focus-within:ring-2 focus-within:ring-zinc-900/10 transition-all">
                <Search size={20} className="text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
                <input
                  autoFocus
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="O que você deseja encontrar?"
                  className="bg-transparent border-none outline-none text-base ml-3 w-full text-zinc-900 placeholder:text-zinc-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="ml-2 p-1 text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
