import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '@/contexts/DataContext';
import { ProductCard } from '@/components/site/ProductCard';
import { ShoppingBag, ArrowRight, Sparkles, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

export const HomePage: React.FC = () => {
  const { products, isLoading } = useData();
  const [scrollY, setScrollY] = React.useState(0);
  const [isAboutModalOpen, setIsAboutModalOpen] = React.useState(false);

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
    const expanded: any[] = [];
    
    siteProducts.forEach(p => {
      const colorsInProduct = Array.from(new Set(p.variants?.map(v => v.cor))).filter(Boolean) as string[];
      
      if (colorsInProduct.length === 0) {
        expanded.push({ displayId: p.id, product: p, preferredColor: undefined });
      } else {
        colorsInProduct.forEach(color => {
          // Verifica se há estoque para esta cor
          const hasStock = p.variants?.some(v => v.cor === color && v.quantidade_estoque > 0);
          if (hasStock) {
            expanded.push({
              displayId: `${p.id}-${color}`,
              product: p,
              preferredColor: color
            });
          }
        });
      }
    });

    // Limitamos aos primeiros 8 para manter a home organizada e com foco
    return expanded.slice(0, 8);
  }, [siteProducts]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[550px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://izixlmmljvhdyoecgjur.supabase.co/storage/v1/object/public/marketing/banners/banner_main.webp"
            alt="Hero Fashion"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        </div>

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
            <p className="text-sm sm:text-base text-white/80 mb-6 sm:mb-8 max-w-lg leading-relaxed">
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
                <h3 className="text-white text-3xl md:text-5xl font-serif mb-2 leading-tight">Conjuntos para Eventos</h3>
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
            <div className="md:col-span-4 md:row-span-1 relative rounded-3xl overflow-hidden group bg-zinc-900 border border-zinc-800 p-10 flex flex-col justify-center">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <ShoppingBag className="text-white" />
              </div>
              <h3 className="text-white text-xl font-bold mb-4">Newsletter Decoty</h3>
              <p className="text-zinc-500 text-sm mb-6">Receba ofertas exclusivas e avisos de lançamentos em primeira mão.</p>
              <div className="flex gap-2">
                <input type="email" placeholder="Seu melhor e-mail" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-white/20" />
                <Button className="bg-white text-black shrink-0">Assinar</Button>
              </div>
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
