import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ShoppingBag, ChevronLeft, ChevronRight, Star, ShieldCheck, Truck, RotateCcw, Ruler, Crown, Heart } from 'lucide-react';
import { SizeGuideModal } from '@/components/site/SizeGuideModal';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

export const ProductDetailsPage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const { products, isLoading } = useData();
  const { addToCart } = useCart();
  const { user } = useAuth();
  
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [isFavorite, setIsFavorite] = useState(false);

  const product = useMemo(() => {
    if (!identifier) return null;
    // Tenta encontrar pelo formato Decoty-X
    let foundProduct;
    if (identifier.startsWith('Decoty-')) {
      const ui_id_str = identifier.replace('Decoty-', '');
      const ui_id = parseInt(ui_id_str);
      foundProduct = products.find(p => p.ui_id === ui_id);
    } else {
      foundProduct = products.find(p => p.id === identifier);
    }
    
    if (foundProduct) {
      const favorites = JSON.parse(localStorage.getItem('decoty_favorites') || '[]');
      setIsFavorite(favorites.includes(foundProduct.id));
    }
    
    return foundProduct;
  }, [identifier, products]);

  const toggleFavorite = () => {
    if (!user) {
      alert('Você precisa estar logada para favoritar uma peça. Faça login para salvar seus favoritos!');
      return;
    }

    if (!product) return;

    const favorites = JSON.parse(localStorage.getItem('decoty_favorites') || '[]');
    let newFavorites;
    if (isFavorite) {
      newFavorites = favorites.filter((id: string) => id !== product.id);
    } else {
      newFavorites = [...favorites, product.id];
    }
    localStorage.setItem('decoty_favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
    window.dispatchEvent(new Event('favorites_updated'));
  };

  const handleAddToCart = () => {
    if (product && selectedVariant) {
      addToCart(product, selectedVariant, 1);
    }
  };

  const images = [
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?q=80&w=1000&auto=format&fit=crop"
  ];

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const selectedVariant = useMemo(() => {
    if (!product || !product.variants) return null;
    if (selectedVariantId) return product.variants.find(v => v.id === selectedVariantId);
    return product.variants[0];
  }, [product, selectedVariantId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-[3/4] bg-zinc-100 rounded-3xl" />
          <div className="space-y-6">
            <div className="h-10 bg-zinc-100 rounded-lg w-2/3" />
            <div className="h-6 bg-zinc-100 rounded-lg w-1/3" />
            <div className="h-32 bg-zinc-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-40 text-center">
        <h2 className="text-2xl font-serif mb-4">Produto não encontrado</h2>
        <Button onClick={() => navigate('/')}>Voltar para a Home</Button>
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const colors = Array.from(new Set(product.variants?.map(v => v.cor) || []));
  const rawSizes = Array.from(new Set(product.variants?.map(v => v.tamanho) || []));
  
  const sizes = useMemo(() => {
    const order: Record<string, number> = { 'PP': 1, 'P': 2, 'M': 3, 'G': 4, 'GG': 5, 'G1': 6, 'G2': 7, 'G3': 8 };
    const sizesArray = rawSizes as string[];
    
    return [...sizesArray].sort((a, b) => {
      const aOrder = order[a.toUpperCase()];
      const bOrder = order[b.toUpperCase()];
      if (aOrder && bOrder) return aOrder - bOrder;
      if (aOrder) return -1;
      if (bOrder) return 1;
      
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    });
  }, [rawSizes]);

  return (
    <div className="pb-20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors py-8 group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Voltar</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
          {/* Gallery Placeholder */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-100 shadow-2xl group/gallery">
              {/* Navigation Arrows */}
              <div className="absolute inset-0 z-30 flex items-center justify-between px-4 opacity-0 group-hover/gallery:opacity-100 transition-all duration-300 pointer-events-none">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
                  }}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/40 transition-colors pointer-events-auto shadow-lg"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
                  }}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/40 transition-colors pointer-events-auto shadow-lg"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              <img 
                src={images[activeImageIndex]} 
                alt={product.nome}
                className="w-full h-full object-cover"
              />
              {/* Peça Única Badge */}
              <div className="absolute top-6 right-6">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
                  <Crown size={16} className="text-white fill-white/20" />
                  <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white">Peça Única</span>
                </div>
              </div>
            </div>
            {/* Gallery Thumbs */}
            <div className="grid grid-cols-4 gap-4">
               {images.map((img, idx) => (
                 <div 
                   key={idx} 
                   onClick={() => setActiveImageIndex(idx)}
                   className={`aspect-square rounded-xl bg-zinc-50 overflow-hidden cursor-pointer border-2 transition-all duration-300 ${activeImageIndex === idx ? 'border-zinc-900 scale-105 shadow-md' : 'border-transparent hover:border-zinc-200 opacity-60'}`}
                 >
                    <img src={img} className="w-full h-full object-cover" />
                 </div>
               ))}
            </div>
          </motion.div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="rounded-full border-zinc-200 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                  {product.marca}
                </Badge>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <span className="text-zinc-400 text-xs ml-1">(4.9)</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-serif text-zinc-950 mb-2">{product.nome}</h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-4">Referência: Decoty-{product.ui_id}</p>
              
              <div className="space-y-1">
                <p className="text-3xl font-black text-zinc-900">
                  {selectedVariant ? formatCurrency(selectedVariant.preco_venda) : 'Preço sob consulta'}
                </p>
                {selectedVariant && (
                   <p className="text-sm text-zinc-500 font-medium">
                     Ou até 5x de <span className="text-zinc-900 font-bold">{formatCurrency(selectedVariant.preco_venda / 5)}</span> sem juros
                   </p>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* Cores */}
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-3">Cores Disponíveis</span>
                <div className="flex flex-wrap gap-3">
                  {colors.map(cor => (
                    <button 
                      key={cor}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                        selectedVariant?.cor === cor 
                          ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg' 
                          : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-900'
                      }`}
                      onClick={() => {
                        const variant = product.variants?.find(v => v.cor === cor);
                        if (variant) setSelectedVariantId(variant.id);
                      }}
                    >
                      {cor}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tamanhos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block">Tamanho</span>
                  <button 
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    <Ruler size={14} />
                    Guia de tamanhos
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {sizes.map(tamanho => {
                    const variant = product.variants?.find(v => v.tamanho === tamanho && (selectedVariant?.cor === v.cor));
                    const isOutOfStock = variant ? variant.quantidade_estoque <= 0 : true;

                    return (
                      <button 
                        key={tamanho}
                        disabled={isOutOfStock}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold border transition-all ${
                          selectedVariant?.tamanho === tamanho 
                            ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg' 
                            : isOutOfStock 
                              ? 'bg-zinc-50 border-zinc-100 text-zinc-300 cursor-not-allowed'
                              : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-900'
                        }`}
                        onClick={() => {
                          if (variant) setSelectedVariantId(variant.id);
                        }}
                      >
                        {tamanho}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-3">Sobre a Peça</span>
                <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap">
                  {product.descricao || 'Nenhuma descrição disponível para este produto.'}
                </p>
              </div>

              {/* Add to Cart */}
              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={handleAddToCart}
                  className="flex-1 h-14 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold flex items-center gap-3 shadow-xl border-none"
                  disabled={!selectedVariant || selectedVariant.quantidade_estoque <= 0}
                >
                  <ShoppingBag size={20} />
                  Adicionar ao Carrinho
                </Button>

                <button 
                  onClick={toggleFavorite}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all shadow-xl active:scale-95 ${
                    isFavorite 
                      ? 'bg-red-500 border-red-500 text-white shadow-red-200' 
                      : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 shadow-zinc-100'
                  }`}
                >
                   <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
                </button>
              </div>

              {/* Perks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-zinc-100">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-900">
                       <Truck size={18} />
                    </div>
                    <div>
                       <p className="text-xs font-bold text-zinc-900">Frete Grátis</p>
                       <p className="text-[10px] text-zinc-500">Acima de R$ 300</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-900">
                       <RotateCcw size={18} />
                    </div>
                    <div>
                       <p className="text-xs font-bold text-zinc-900">Troca Fácil</p>
                       <p className="text-[10px] text-zinc-500">Até 30 dias</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-900">
                       <ShieldCheck size={18} />
                    </div>
                    <div>
                       <p className="text-xs font-bold text-zinc-900">Pagamento Seguro</p>
                       <p className="text-[10px] text-zinc-500">Cartão ou PIX</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
    </div>
  );
};
