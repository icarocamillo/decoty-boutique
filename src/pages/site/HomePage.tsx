import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '@/contexts/DataContext';
import { ProductCard } from '@/components/site/ProductCard';
import { ShoppingBag, ArrowRight, Sparkles, ChevronDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { backendService } from '@/services/backendService';

const HOME_PHRASES = [
  "A elegância mora nos detalhes.",
  "A elegância está no corte.",
  "Sofisticação em cada costura.",
  "O estilo vive nos detalhes.",
  "A beleza está no acabamento.",
  "Onde o detalhe faz a moda.",
  "O segredo da peça está no detalhe.",
  "Elegância é uma questão de detalhe.",
  "O toque que define o estilo.",
  "Moda se faz com detalhes.",
  "A perfeição está no que ninguém vê.",
  "Modernidade com detalhes que encantam.",
  "Onde o clássico encontra o moderno."
];

const EMAIL_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'uol.com.br',
  'bol.com.br',
  'icloud.com'
];

export const HomePage: React.FC = () => {
  const { products, isLoading } = useData();
  const [scrollY, setScrollY] = React.useState(0);
  const [isAboutModalOpen, setIsAboutModalOpen] = React.useState(false);

  // State for product rotation offset across refreshes
  const [rotationOffset, setRotationOffset] = React.useState(0);

  const [banners, setBanners] = React.useState<string[]>([
    "https://izixlmmljvhdyoecgjur.supabase.co/storage/v1/object/public/marketing/banners/banner_main.webp"
  ]);
  const [currentBannerIndex, setCurrentBannerIndex] = React.useState(0);
  const [bannersLoading, setBannersLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    const fetchBanners = async () => {
      try {
        const fetched = await backendService.getMarketingBanners();
        if (active && fetched && fetched.length > 0) {
          setBanners(fetched);
        }
      } catch (err) {
        console.warn("Aviso ao carregar banners (usando lista estática):", err);
      } finally {
        if (active) {
          setBannersLoading(false);
        }
      }
    };
    fetchBanners();
    return () => {
      active = false;
    };
  }, []);

  const handleNextBanner = () => {
    setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
  };

  const handlePrevBanner = () => {
    setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const touchRef = React.useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchRef.current.x;
    const deltaY = touch.clientY - touchRef.current.y;
    const duration = Date.now() - touchRef.current.time;

    touchRef.current = null;

    const minDistanceX = 60; // Pelo menos 60px de arraste horizontal
    const maxDistanceY = 50; // No máximo 50px de desvio vertical para não atrapalhar o scroll
    const maxDuration = 400; // Swipe rápido (menos de 400ms)

    if (
      Math.abs(deltaX) > minDistanceX && 
      Math.abs(deltaY) < maxDistanceY && 
      duration < maxDuration
    ) {
      if (deltaX > 0) {
        handlePrevBanner();
      } else {
        handleNextBanner();
      }
    }
  };

  React.useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [banners.length]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('decoty_home_products_offset');
      const current = stored ? parseInt(stored, 10) : 0;
      localStorage.setItem('decoty_home_products_offset', String(current + 1));
      setRotationOffset(current);
    } catch (e) {
      // Fallback inside sandboxed frame or on privacy error
      setRotationOffset(Math.floor(Date.now() / 10000) % 20);
    }
  }, []);

  const [newsletterEmail, setNewsletterEmail] = React.useState('');
  const [isSubmittingNewsletter, setIsSubmittingNewsletter] = React.useState(false);
  const [newsletterMessage, setNewsletterMessage] = React.useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // States and Ref for domain suggestions
  const [activeSuggestionIndex, setActiveSuggestionIndex] = React.useState(0);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const suggestionsContainerRef = React.useRef<HTMLDivElement>(null);

  const suggestions = React.useMemo(() => {
    const trimmed = newsletterEmail.trim();
    if (!trimmed) return [];
    
    if (!trimmed.includes('@')) {
      return EMAIL_DOMAINS.map(domain => `${trimmed}@${domain}`);
    }
    
    const atIndex = trimmed.indexOf('@');
    const prefix = trimmed.slice(0, atIndex);
    const suffix = trimmed.slice(atIndex + 1).toLowerCase();
    
    if (!prefix) return [];
    
    const matchingDomains = EMAIL_DOMAINS.filter(domain => domain.startsWith(suffix));
    
    if (matchingDomains.length === 1 && matchingDomains[0] === suffix) {
      return [];
    }
    
    return matchingDomains.map(domain => `${prefix}@${domain}`);
  }, [newsletterEmail]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsContainerRef.current && !suggestionsContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setIsSubmittingNewsletter(true);
    setNewsletterMessage(null);
    setShowSuggestions(false);
    try {
      const res = await backendService.subscribeNewsletter(newsletterEmail);
      if (res.success) {
        setNewsletterMessage({ text: res.message, type: 'success' });
        setNewsletterEmail('');
      } else {
        setNewsletterMessage({ text: res.message, type: 'error' });
      }
    } catch (err) {
      setNewsletterMessage({ text: 'Ocorreu um erro ao assinar a newsletter.', type: 'error' });
    } finally {
      setIsSubmittingNewsletter(false);
    }
  };

  React.useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sorteia uma frase ao carregar a página
  const randomHeadline = useMemo(() => {
    return HOME_PHRASES[Math.floor(Math.random() * HOME_PHRASES.length)];
  }, []);

  // Filtrar produtos que devem aparecer no site (flag show_on_site)
  const siteProducts = products.filter(p => p.show_on_site && p.variants && p.variants.length > 0);

  // Grid de Produtos a serem exibidos (expandidos por cor como no catálogo)
  const displayProducts = useMemo(() => {
    // 1. Primeiro ordenamos todos os produtos do site do mais recente ao mais antigo
    const sortedProducts = [...siteProducts].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    // 2. Agrupamos por categoria, mantendo a ordenação por data já estabelecida
    const productsByCategory: { [key: string]: typeof siteProducts } = {};
    sortedProducts.forEach(p => {
      const cat = p.categoria || 'Sem Categoria';
      if (!productsByCategory[cat]) {
        productsByCategory[cat] = [];
      }
      productsByCategory[cat].push(p);
    });

    // 3. Selecionamos os produtos intercalando as categorias (round-robin)
    // Coletamos uma lista ordenada de chaves de categorias
    // Para ser determinístico, as categorias começam pelas que têm o produto mais recente
    const categoryKeys = Object.keys(productsByCategory).sort((catA, catB) => {
      const newestA = productsByCategory[catA][0]?.created_at;
      const newestB = productsByCategory[catB][0]?.created_at;
      const dateA = newestA ? new Date(newestA).getTime() : 0;
      const dateB = newestB ? new Date(newestB).getTime() : 0;
      return dateB - dateA;
    });

    const maxProductsPerCategory = 2;
    const selectedByCategory: { [key: string]: typeof siteProducts } = {};

    categoryKeys.forEach(cat => {
      const catProducts = productsByCategory[cat];
      const N = catProducts.length;
      if (N <= maxProductsPerCategory) {
        selectedByCategory[cat] = catProducts;
      } else {
        // Rotaciona as opções suavemente a cada atualização de página (1 em 1 índice)
        // Isso vai revelando produtos mais antigos passo a passo e depois reinicia (wrap around)
        const idx1 = rotationOffset % N;
        const idx2 = (rotationOffset + 1) % N;
        
        const p1 = catProducts[idx1];
        const p2 = catProducts[idx2];
        
        if (p1.id === p2.id) {
          selectedByCategory[cat] = [p1];
        } else {
          selectedByCategory[cat] = [p1, p2];
        }
      }
    });

    const selectedProducts: typeof siteProducts = [];

    // Faremos até 2 passagens (já que queremos até 2 produtos de cada categoria)
    for (let round = 0; round < maxProductsPerCategory; round++) {
      categoryKeys.forEach(cat => {
        const prod = selectedByCategory[cat]?.[round];
        if (prod) {
          selectedProducts.push(prod);
        }
      });
    }

    // 4. Expandimos os produtos selecionados em cores para exibição, preservando a ordem intercalada
    const expanded: any[] = [];
    
    selectedProducts.forEach(p => {
      const colorsInProduct = Array.from(new Set(p.variants?.map(v => v.cor))).filter(Boolean) as string[];
      
      if (colorsInProduct.length === 0) {
        expanded.push({ 
          displayId: p.id, 
          product: p, 
          preferredColor: undefined,
          createdAt: p.created_at 
        });
      } else {
        colorsInProduct.forEach(color => {
          // Verifica se há estoque para esta cor
          const hasStock = p.variants?.some(v => v.cor === color && v.quantidade_estoque > 0);
          if (hasStock) {
            expanded.push({
              displayId: `${p.id}-${color}`,
              product: p,
              preferredColor: color,
              createdAt: p.created_at
            });
          }
        });
      }
    });

    // Limitamos a exatamente 8 itens de exibição para manter um design limpo e estruturado
    return expanded.slice(0, 8);
  }, [siteProducts, rotationOffset]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative h-[50vh] min-h-[550px] flex items-center overflow-hidden"
      >
        <div className="absolute inset-0 z-0 select-none">
          <AnimatePresence mode="popLayout">
            <motion.img
              key={currentBannerIndex}
              src={banners[currentBannerIndex]}
              alt={`Banner ${currentBannerIndex + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
        </div>

        {banners.length > 1 && (
          <>
            <button
              onClick={handlePrevBanner}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all border border-white/10 group active:scale-95 cursor-pointer items-center justify-center"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={handleNextBanner}
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all border border-white/10 group active:scale-95 cursor-pointer items-center justify-center"
              aria-label="Próximo"
            >
              <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
            </button>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 bg-black/25 px-3 py-1.5 rounded-full backdrop-blur-sm">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentBannerIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentBannerIndex ? 'bg-white w-5' : 'bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Ir para o banner ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="container mx-auto px-4 sm:px-6 z-10 pt-16 sm:pt-20">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl text-white"
          >
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <span className="w-8 sm:w-12 h-px bg-white/60" />
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] font-bold text-white/80">Nova Coleção Outono & Inverno 2026</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif mb-4 sm:mb-6 leading-tight">
              {randomHeadline}
            </h1>
            <p className="text-sm sm:text-base text-white/95 mb-6 sm:mb-8 max-w-lg leading-relaxed font-bold">
              Descubra uma boutique experiente que celebra a feminilidade e o estilo moderno. Peças elegantes que contam sua história.
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Link to="/catalogo" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-48 bg-zinc-900 !text-white hover:bg-zinc-800 rounded-full h-12 text-sm font-bold shadow-xl">
                  Vitrine de Hoje
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => setIsAboutModalOpen(true)}
                className="w-full sm:w-48 !text-white border-white hover:bg-white hover:!text-black rounded-full h-12 text-sm flex items-center justify-center gap-2 backdrop-blur-sm bg-white/10 font-bold transition-all duration-300"
              >
                Sobre a Decoty
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="pt-10 pb-20 bg-zinc-50/50 relative">
        {/* Floating Indicator - Alinhado com Destaques e totalmente preto */}
        <AnimatePresence>
          {scrollY === 0 && (
            <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-20">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40, scale: 0.8 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="flex flex-col items-center will-change-transform"
              >
                <div className="animate-bounce flex flex-col items-center">
                  <span className="text-[9px] uppercase font-black tracking-widest text-zinc-950 -mb-1">Descubra abaixo</span>
                  <ChevronDown className="text-zinc-950" strokeWidth={1} size={32} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Sparkles size={16} />
                <span className="text-xs uppercase font-black tracking-widest">Destaques</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-serif text-zinc-950">Favoritos da Temporada</h2>
              <p className="text-zinc-500 mt-2">Escolha as peças mais procuradas entre nossas clientes.</p>
            </div>
            <Link to="/catalogo">
              <Button variant="link" className="text-zinc-900 font-bold flex items-center gap-2 p-0 h-auto group">
                Ver todos os produtos <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="aspect-[3/4] bg-zinc-200 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : siteProducts.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-zinc-200">
              <ShoppingBag className="mx-auto text-zinc-200 mb-4" size={48} />
              <h3 className="text-xl font-bold text-zinc-900">Nenhum produto disponível</h3>
              <p className="text-zinc-500">Estamos preparando novidades incríveis para você.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {displayProducts.map((item) => (
                <ProductCard key={item.displayId} product={item.product} preferredColor={item.preferredColor} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories / Bento Grid (Visual Placeholder) */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 grid-rows-2 h-[800px] gap-4">
            <div className="md:col-span-8 md:row-span-2 relative rounded-3xl overflow-hidden group">
              <img
                src="https://izixlmmljvhdyoecgjur.supabase.co/storage/v1/object/public/marketing/banners/banner_looks_noite.webp"
                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                alt="Destaque"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-12">
                <h3 className="text-white text-3xl md:text-5xl font-serif mb-2 leading-tight">Conjuntos para Impressionar</h3>
                <p className="text-white/90 mb-6 text-sm md:text-lg max-w-xs md:max-w-sm font-medium">Destaque-se com brilho e sofisticação em seus compromissos.</p>
                <Link to="/catalogo?category=Conjuntos">
                  <Button className="w-fit bg-zinc-900 !text-white hover:bg-zinc-800 rounded-full font-bold px-8 h-12 shadow-xl border border-white/10 transition-transform active:scale-95">
                    Explorar Categoria
                  </Button>
                </Link>
              </div>
            </div>
            <Link to="/catalogo?category=Pulseiras&category=Brincos&category=Colares" className="md:col-span-4 md:row-span-1 relative rounded-3xl overflow-hidden group block cursor-pointer">
              <img
                src="https://izixlmmljvhdyoecgjur.supabase.co/storage/v1/object/public/marketing/banners/banner_acessorios.webp"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt="Acessórios"
              />
              <div className="absolute inset-0 bg-black/5 flex items-center justify-center transition-all duration-500 group-hover:bg-black/20">
                <div className="px-6 py-3 rounded-full border border-black/10 backdrop-blur-md bg-white/40 transition-all duration-500 group-hover:border-black/20 group-hover:bg-white/60 group-hover:scale-105">
                  <h3 className="text-zinc-950 text-xl font-serif text-center">Acessórios Modernos</h3>
                </div>
              </div>
            </Link>
            <div className="md:col-span-4 md:row-span-1 relative rounded-3xl group bg-zinc-900 border border-zinc-800 p-10 flex flex-col justify-center">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <ShoppingBag className="text-white" />
              </div>
              <h3 className="text-white text-xl font-bold mb-4">Newsletter Decoty</h3>
              <p className="text-zinc-500 text-sm mb-6">Receba ofertas exclusivas e avisos de lançamentos em primeira mão.</p>
              <form onSubmit={handleNewsletterSubscribe} className="space-y-3">
                <div className="flex gap-2">
                  <div ref={suggestionsContainerRef} className="relative flex-1">
                    <input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => {
                        setNewsletterEmail(e.target.value);
                        setActiveSuggestionIndex(0);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={(e) => {
                        if (!showSuggestions || suggestions.length === 0) return;
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setActiveSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          setNewsletterEmail(suggestions[activeSuggestionIndex]);
                          setShowSuggestions(false);
                        } else if (e.key === 'Escape') {
                          setShowSuggestions(false);
                        }
                      }}
                      placeholder="Seu melhor e-mail"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                      disabled={isSubmittingNewsletter}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <ul className="absolute left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto overflow-x-hidden divide-y divide-white/5">
                        {suggestions.map((sug, index) => (
                          <li
                            key={sug}
                            onClick={() => {
                              setNewsletterEmail(sug);
                              setShowSuggestions(false);
                            }}
                            onMouseEnter={() => setActiveSuggestionIndex(index)}
                            className={`px-4 py-2 text-xs cursor-pointer text-left font-mono transition-colors duration-150 ${
                              index === activeSuggestionIndex 
                                ? 'bg-white/10 text-white font-medium' 
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {sug}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="bg-white text-black shrink-0 font-medium h-auto py-2"
                    disabled={isSubmittingNewsletter}
                  >
                    {isSubmittingNewsletter ? 'Enviando...' : 'Assinar'}
                  </Button>
                </div>
                {newsletterMessage && (
                  <p className={`text-xs mt-1 font-medium ${newsletterMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {newsletterMessage.text}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Modal - Sobre a Decoty em Construção */}
      <AnimatePresence>
        {isAboutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAboutModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 shadow-2xl z-10 border border-zinc-100 dark:border-zinc-800 text-center"
            >
              <button
                onClick={() => setIsAboutModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="text-zinc-900 dark:text-zinc-100 animate-pulse" size={30} />
              </div>

              <h3 className="text-2xl font-serif font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                História em Moda...
              </h3>
              
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                Nossa página <strong className="text-zinc-900 dark:text-zinc-100 font-bold">Sobre a Decoty</strong> está sendo cuidadosamente desenhada! 
                Em breve, compartilharemos com você toda a nossa paixão, inspiração e a história por trás de cada detalhe da nossa boutique de moda. 
                <br /><br />
                Agradecemos pelo carinho e pela companhia! ✨
              </p>

              <Button
                onClick={() => setIsAboutModalOpen(false)}
                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-full py-3 font-bold h-12 transition-transform active:scale-95 shadow-lg"
              >
                Até breve!
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
