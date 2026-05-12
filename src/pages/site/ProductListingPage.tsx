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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Estados dos filtros derivados da URL
  const activeFilters = useMemo(() => ({
    category: searchParams.getAll('category'),
    color: searchParams.getAll('color'),
    size: searchParams.getAll('size'),
    minPrice: parseInt(searchParams.get('minPrice') || '0'),
    maxPrice: parseInt(searchParams.get('maxPrice') || '2000'),
    sort: searchParams.get('sort') || 'newest',
    search: searchParams.get('search') || ''
  }), [searchParams]);

  // Extrair opções únicas para os filtros (Dinâmico/Faceted)
  const filterOptions = useMemo(() => {
    // Para uma melhor UX de filtros, calculamos as opções disponíveis 
    // baseadas nos filtros das OUTRAS dimensões.
    
    // Helper para verificar se um produto bate com a busca
    const matchesSearch = (p: Product) => {
      if (!activeFilters.search) return true;
      const query = activeFilters.search.toLowerCase();
      return (
        p.nome.toLowerCase().includes(query) ||
        p.categoria?.toLowerCase().includes(query) ||
        (p.marca || 'Decoty').toLowerCase().includes(query) ||
        p.descricao?.toLowerCase().includes(query)
      );
    };

    const categories = new Set<string>();
    const colors = new Set<string>();
    const sizes = new Set<string>();

    products.forEach(p => {
      if (!matchesSearch(p)) return;

      // 1. Categorias possíveis 
      // (Respeita cor e tamanho ativos)
      const hasStockInCurrentColorSize = p.variants?.some(v => {
        const mColor = activeFilters.color.length === 0 || activeFilters.color.includes(v.cor);
        const mSize = activeFilters.size.length === 0 || activeFilters.size.includes(v.tamanho);
        return mColor && mSize && v.quantidade_estoque > 0;
      });
      if (hasStockInCurrentColorSize && p.categoria) categories.add(p.categoria);

      // 2. Cores possíveis 
      // (Respeita categoria e tamanho ativos)
      const matchesCategory = activeFilters.category.length === 0 || activeFilters.category.includes(p.categoria);
      if (matchesCategory) {
        p.variants?.forEach(v => {
          const mSize = activeFilters.size.length === 0 || activeFilters.size.includes(v.tamanho);
          if (mSize && v.quantidade_estoque > 0 && v.cor) {
            colors.add(v.cor);
          }
        });
      }

      // 3. Tamanhos possíveis (O ponto principal solicitado)
      // (Respeita categoria e cor ativos)
      if (matchesCategory) {
        p.variants?.forEach(v => {
          const mColor = activeFilters.color.length === 0 || activeFilters.color.includes(v.cor);
          if (mColor && v.quantidade_estoque > 0 && v.tamanho) {
            sizes.add(v.tamanho);
          }
        });
      }
    });

    // Se um filtro está ativo mas não teria resultados, mantemos ele na lista 
    // para evitar que a opção suma da tela enquanto o usuário a está desmarcando.
    activeFilters.category.forEach(c => categories.add(c));
    activeFilters.color.forEach(c => colors.add(c));
    activeFilters.size.forEach(s => sizes.add(s));

    return {
      categories: Array.from(categories).sort(),
      colors: Array.from(colors).sort(),
      sizes: Array.from(sizes).sort((a, b) => {
         const order: Record<string, number> = { 'P': 1, 'M': 2, 'G': 3, 'GG': 4, 'G1': 5 };
         return (order[a] || 99) - (order[b] || 99);
      })
    };
  }, [products, activeFilters]);

  // Lógica de Filtragem e Ordenação
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      // 0. Filtro fundamental: Mostrar no Site
      if (!p.show_on_site) return false;

      // 0. Busca por Texto (Search)
      if (activeFilters.search) {
        const query = activeFilters.search.toLowerCase();
        const matchesName = p.nome.toLowerCase().includes(query);
        const matchesCategory = p.categoria?.toLowerCase().includes(query);
        const matchesBrand = (p.marca || 'Decoty').toLowerCase().includes(query);
        const matchesDescription = p.descricao?.toLowerCase().includes(query);
        
        if (!matchesName && !matchesCategory && !matchesBrand && !matchesDescription) {
          return false;
        }
      }

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

  // Grid de Produtos a serem exibidos (expandidos por cor se houver múltiplos filtros de cor)
  const displayProducts = useMemo(() => {
    const expanded: any[] = [];
    
    filteredProducts.forEach(p => {
      // Cores a considerar: se houver filtro de cor, usa as do filtro. Senão, cores do produto.
      const colorsInProduct = Array.from(new Set(p.variants?.map(v => v.cor))).filter(Boolean) as string[];
      
      const colorsToExpand = activeFilters.color.length > 0 
        ? activeFilters.color.filter(c => colorsInProduct.includes(c))
        : colorsInProduct;

      if (colorsToExpand.length === 0) {
        // Se não tem cores/variantes (produto simples), adiciona como um só
        expanded.push({ displayId: p.id, product: p, preferredColor: undefined });
        return;
      }

      colorsToExpand.forEach(color => {
        // INTERSECÇÃO INTELIGENTE: Verifica se esta cor possui variantes 
        // que atendem aos OUTROS filtros ativos (Tamanho e Preço)
        const hasValidVariantForThisColor = p.variants?.some(v => {
          if (v.cor !== color) return false;
          
          const matchesSize = activeFilters.size.length === 0 || activeFilters.size.includes(v.tamanho);
          const matchesPrice = v.preco_venda >= activeFilters.minPrice && v.preco_venda <= activeFilters.maxPrice;
          const hasStock = v.quantidade_estoque > 0;
          
          return matchesSize && matchesPrice && hasStock;
        });

        if (hasValidVariantForThisColor) {
          expanded.push({
            displayId: `${p.id}-${color}`,
            product: p,
            preferredColor: color
          });
        }
      });
    });

    return expanded;
  }, [filteredProducts, activeFilters]);

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
      <div className="relative h-[40vh] min-h-[320px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=2070&auto=format&fit=crop"
            alt="Boutique Curadoria"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 w-full px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-white/80">
                {activeFilters.search ? 'Resultados da Busca' : 'Nossa Coleção'}
              </span>
              <h1 className="text-4xl md:text-6xl font-serif text-white tracking-tight">
                {activeFilters.search ? `"${activeFilters.search}"` : 'Catálogo Completo'}
              </h1>
              {!activeFilters.search && (
                <p className="text-white/60 text-sm max-w-md mt-2 leading-relaxed">
                  Explore nossa curadoria exclusiva de peças que unem elegância, conforto e o melhor das tendências para o seu dia a dia.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        {/* Top bar control */}
        <div className={`flex items-center justify-between py-4 mb-8 sticky top-[64px] z-40 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/40 backdrop-blur-lg shadow-sm px-6 -mx-6 border-b border-zinc-100' 
            : 'bg-white border-y border-zinc-100'
        }`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-full text-xs font-bold uppercase tracking-wider"
            >
              <Filter size={14} />
              Filtrar
            </button>
            <p className="text-sm text-zinc-500 hidden sm:block">
              Mostrando <span className="font-bold text-zinc-900">{displayProducts.length}</span> {displayProducts.length === 1 ? 'produto' : 'produtos'}
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
            ) : displayProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-12">
                {displayProducts.map((item) => (
                  <ProductCard 
                    key={item.displayId} 
                    product={item.product} 
                    preferredColor={item.preferredColor} 
                  />
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
