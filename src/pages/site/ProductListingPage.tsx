import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '@/contexts/DataContext';
import { ProductCard } from '@/components/site/ProductCard';
import { FilterSidebar } from '@/components/site/FilterSidebar';
import { PLPSkeleton } from '@/components/site/PLPSkeleton';
import { Product } from '@/types';

export const ProductListingPage: React.FC = () => {
  const { products, isLoading } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Estados dos filtros derivados da URL
  const activeFilters = useMemo(() => ({
    category: searchParams.getAll('category'),
    color: searchParams.getAll('color'),
    size: searchParams.getAll('size'),
    minPrice: parseInt(searchParams.get('minPrice') || '0'),
    maxPrice: parseInt(searchParams.get('maxPrice') || '2000'),
    sort: searchParams.get('sort') || 'newest'
  }), [searchParams]);

  // Extrair opções únicas para os filtros
  const filterOptions = useMemo(() => {
    const categories = new Set<string>();
    const colors = new Set<string>();
    const sizes = new Set<string>();

    products.forEach(p => {
      if (p.categoria) categories.add(p.categoria);
      p.variants?.forEach(v => {
        if (v.cor) colors.add(v.cor);
        if (v.tamanho) sizes.add(v.tamanho);
      });
    });

    return {
      categories: Array.from(categories).sort(),
      colors: Array.from(colors).sort(),
      sizes: Array.from(sizes).sort((a, b) => {
         // Ordenação básica de tamanhos P, M, G...
         const order: Record<string, number> = { 'P': 1, 'M': 2, 'G': 3, 'GG': 4, 'G1': 5 };
         return (order[a] || 99) - (order[b] || 99);
      })
    };
  }, [products]);

  // Lógica de Filtragem e Ordenação
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      // 1. Filtro de Categoria
      if (activeFilters.category.length > 0 && !activeFilters.category.includes(p.categoria)) {
        return false;
      }

      // 2. Filtro de Preço e Variantes (Cor/Tamanho)
      const hasMatchingVariant = p.variants?.some(v => {
        const matchesColor = activeFilters.color.length === 0 || activeFilters.color.includes(v.cor);
        const matchesSize = activeFilters.size.length === 0 || activeFilters.size.includes(v.tamanho);
        const matchesPrice = v.preco_venda >= activeFilters.minPrice && v.preco_venda <= activeFilters.maxPrice;
        return matchesColor && matchesSize && matchesPrice;
      });

      return hasMatchingVariant;
    });

    // Ordenação
    result.sort((a, b) => {
      const getMinPrice = (p: Product) => p.variants && p.variants.length > 0 
        ? Math.min(...p.variants.map(v => v.preco_venda)) 
        : 0;

      if (activeFilters.sort === 'price_asc') return getMinPrice(a) - getMinPrice(b);
      if (activeFilters.sort === 'price_desc') return getMinPrice(b) - getMinPrice(a);
      if (activeFilters.sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

    return result;
  }, [products, activeFilters]);

  // Handlers
  const handleFilterChange = (type: 'category' | 'color' | 'size', value: string) => {
    const current = searchParams.getAll(type);
    const updated = current.includes(value) 
      ? current.filter(v => v !== value) 
      : [...current, value];
    
    // Atualiza apenas os params desse tipo
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(type);
    updated.forEach(v => newParams.append(type, v));
    setSearchParams(newParams);
  };

  const handlePriceChange = (min: number, max: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('minPrice', min.toString());
    newParams.set('maxPrice', max.toString());
    setSearchParams(newParams);
  };

  const handleSortChange = (sort: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', sort);
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Hero Header */}
      <div className="bg-zinc-50 pt-32 pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Nossa Coleção</span>
            <h1 className="text-4xl md:text-5xl font-serif text-zinc-900">Catálogo Completo</h1>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Top bar control */}
        <div className="flex items-center justify-between py-4 border-y border-zinc-100 mb-8 sticky top-[64px] bg-white z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-full text-xs font-bold uppercase tracking-wider"
            >
              <Filter size={14} />
              Filtrar
            </button>
            <p className="text-sm text-zinc-500 hidden sm:block">
              Mostrando <span className="font-bold text-zinc-900">{filteredProducts.length}</span> produtos
            </p>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative group">
                <select 
                  value={activeFilters.sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="appearance-none bg-zinc-50 border-none px-4 py-2 pr-10 rounded-full text-xs font-bold uppercase tracking-wider text-zinc-900 cursor-pointer focus:ring-2 focus:ring-zinc-900 transition-all outline-none"
                >
                  <option value="newest">Lançamentos</option>
                  <option value="price_asc">Menor Preço</option>
                  <option value="price_desc">Maior Preço</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
             </div>
          </div>
        </div>

        <div className="flex gap-12">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 shrink-0 sticky top-32 h-[calc(100vh-160px)]">
            <FilterSidebar 
              categories={filterOptions.categories}
              colors={filterOptions.colors}
              sizes={filterOptions.sizes}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              onPriceChange={handlePriceChange}
              onClearFilters={handleClearFilters}
            />
          </aside>

          {/* Grid de Produtos */}
          <div className="flex-1">
            {isLoading ? (
              <PLPSkeleton />
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-12">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                  <Filter size={32} className="text-zinc-300" />
                </div>
                <h3 className="text-xl font-serif text-zinc-900 mb-2">Nenhum produto encontrado</h3>
                <p className="text-zinc-500 mb-8 max-w-xs">Tente ajustar seus filtros ou limpar as seleções para ver mais resultados.</p>
                <button 
                  onClick={handleClearFilters}
                  className="px-8 py-3 bg-zinc-900 text-white rounded-full font-bold uppercase tracking-wider text-xs shadow-lg hover:shadow-xl transition-all"
                >
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {isMobileFiltersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFiltersOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xs bg-white z-[110] p-6 shadow-2xl flex flex-col lg:hidden"
            >
              <FilterSidebar 
                categories={filterOptions.categories}
                colors={filterOptions.colors}
                sizes={filterOptions.sizes}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onPriceChange={handlePriceChange}
                onClearFilters={handleClearFilters}
                onCloseMobile={() => setIsMobileFiltersOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
