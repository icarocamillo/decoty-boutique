import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '@/contexts/DataContext';
import { ProductCard } from '@/components/site/ProductCard';
import { ShoppingBag, ArrowRight, Sparkles, ChevronDown } from 'lucide-react';
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
  "Onde o clássico encontra o moderno.",
  "Menos tendência, mais exclusividade."
];

export const HomePage: React.FC = () => {
  const { products, isLoading } = useData();
  const [scrollY, setScrollY] = React.useState(0);

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

  // Filtrar produtos que devem aparecer no site (se houver essa flag)
  // Como não temos a flag explicitamente em todos, vamos mostrar os que tem variantes
  const siteProducts = products.filter(p => p.variants && p.variants.length > 0);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[550px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop"
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
              Descubra uma boutique exclusiva que celebra a feminilidade e o estilo moderno. Peças elegantes que contam sua história.
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Link to="/catalogo" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-48 bg-white text-black hover:bg-zinc-100 rounded-full h-12 text-sm font-bold shadow-xl">
                  Nossa Vitrine
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-48 !text-white border-white hover:bg-white hover:!text-black rounded-full h-12 text-sm flex items-center justify-center gap-2 backdrop-blur-sm bg-white/10 font-bold transition-all duration-300">
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
            <Button variant="link" className="text-zinc-900 font-bold flex items-center gap-2 p-0 h-auto group">
              Ver todos os produtos <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>
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
              {siteProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
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
                src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt="Destaque"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-10">
                <h3 className="text-white text-4xl font-serif mb-2">Looks para Noite</h3>
                <p className="text-white/80 mb-6 max-w-sm">Destaque-se com brilho e sofisticação em seus eventos.</p>
                <Button className="w-fit bg-white text-black hover:bg-zinc-100">Explorar Categoria</Button>
              </div>
            </div>
            <div className="md:col-span-4 md:row-span-1 relative rounded-3xl overflow-hidden group">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000&auto=format&fit=crop"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt="Acessórios"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <h3 className="text-white text-2xl font-serif uppercase tracking-widest text-center px-4">Acessórios Exclusivos</h3>
              </div>
            </div>
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
    </div>
  );
};
