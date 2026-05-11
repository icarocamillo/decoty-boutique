import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ShoppingBag, ChevronLeft, ChevronRight, Star, ShieldCheck, Truck, RotateCcw, Ruler, Crown, Heart, MessageCircle, Phone } from 'lucide-react';
import { SizeGuideModal } from '@/components/site/SizeGuideModal';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { getColorValue } from '@/utils/colorUtils';

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
    
    let foundProduct;
    
    // Tenta o novo formato: {slug}-{ui_id}
    const match = identifier.match(/(.+)-(\d+)$/);
    if (match) {
      const ui_id = parseInt(match[2]);
      foundProduct = products.find(p => p.ui_id === ui_id);
    } 
    
    // Fallback para formato antigo Decoty-X ou UUID direto se não encontrou no formato novo
    if (!foundProduct) {
      if (identifier.startsWith('Decoty-')) {
        const ui_id_str = identifier.replace('Decoty-', '');
        const ui_id = parseInt(ui_id_str);
        foundProduct = products.find(p => p.ui_id === ui_id);
      } else {
        foundProduct = products.find(p => p.id === identifier);
      }
    }
    
    if (foundProduct) {
      // Favoritos check moved to useEffect to avoid infinite loop
    }
    
    return foundProduct;
  }, [identifier, products]);

  // Sync favorite state when product is found
  React.useEffect(() => {
    if (product) {
      const favorites = JSON.parse(localStorage.getItem('decoty_favorites') || '[]');
      setIsFavorite(favorites.includes(product.id));
    }
  }, [product]);

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

  const [searchParams] = useSearchParams();
  const initialColor = searchParams.get('cor');

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Selecionar variante inicial baseada no parâmetro de cor ou na foto principal do catálogo
  React.useEffect(() => {
    if (product && product.variants && !selectedVariantId) {
      if (initialColor) {
        const variantByColor = product.variants.find(v => v.cor === initialColor);
        if (variantByColor) {
          setSelectedVariantId(variantByColor.id);
          return;
        }
      }
      
      // Fallback 1: Cor da foto principal do catálogo
      const mainImage = product.images?.find(img => img.is_default_product_photo);
      if (mainImage && mainImage.cor) {
        const variantByMainImg = product.variants.find(v => v.cor === mainImage.cor);
        if (variantByMainImg) {
          setSelectedVariantId(variantByMainImg.id);
          return;
        }
      }

      // Fallback 2: Primeira variante disponível
      if (product.variants.length > 0) {
        setSelectedVariantId(product.variants[0].id);
      }
    }
  }, [product, initialColor, selectedVariantId]);

  const selectedVariant = useMemo(() => {
    if (!product || !product.variants) return null;
    if (selectedVariantId) return product.variants.find(v => v.id === selectedVariantId);
    return product.variants[0];
  }, [product, selectedVariantId]);

  const productImages = useMemo(() => {
    if (!product || !product.images || product.images.length === 0) {
      return [
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?q=80&w=1000&auto=format&fit=crop"
      ];
    }

    const allImages = [...product.images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    if (selectedVariant?.cor) {
      const colorImages = allImages.filter(img => img.cor === selectedVariant.cor);
      
      // Prioriza imagens da cor selecionada. Se não houver, mostra as gerais (sem cor).
      // Se não houver nenhuma, mostra todas como fallback.
      const imagesToShow = colorImages.length > 0 
        ? colorImages 
        : allImages.filter(img => !img.cor).length > 0
          ? allImages.filter(img => !img.cor)
          : allImages;
      
      return [...imagesToShow].sort((a, b) => {
        if (a.is_main && !b.is_main) return -1;
        if (!a.is_main && b.is_main) return 1;
        return (a.display_order || 0) - (b.display_order || 0);
      }).map(img => img.url);
    }

    return allImages.map(img => img.url);
  }, [product, selectedVariant]);

  React.useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedVariant?.cor]);

  const thumbnailRef = React.useRef<HTMLDivElement>(null);

  const scrollThumbnails = (direction: 'left' | 'right') => {
    if (thumbnailRef.current) {
      const scrollAmount = 150;
      thumbnailRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const colors = Array.from(new Set(product?.variants?.map(v => v.cor || '') || [])) as string[];
  const rawSizes = Array.from(new Set(product?.variants?.map(v => v.tamanho) || []));
  
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
              {/* Main Image */}
              <motion.img 
                key={activeImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={productImages[activeImageIndex]} 
                alt={product.nome}
                className="w-full h-full object-cover select-none"
              />

              {/* Navigation Arrows & Click Handlers */}
              <div className="absolute inset-0 z-20 pointer-events-none">
                {/* Left Click Region */}
                <div 
                  className="absolute inset-y-0 left-0 w-1/4 pointer-events-auto cursor-pointer"
                  onClick={() => setActiveImageIndex(prev => (prev === 0 ? productImages.length - 1 : prev - 1))}
                />
                {/* Right Click Region */}
                <div 
                  className="absolute inset-y-0 right-0 w-1/4 pointer-events-auto cursor-pointer"
                  onClick={() => setActiveImageIndex(prev => (prev === productImages.length - 1 ? 0 : prev + 1))}
                />

                {/* Arrow Icons - More visible on mobile, hover on desktop */}
                <div className="absolute inset-0 flex items-center justify-between px-4 opacity-100 md:opacity-0 md:group-hover/gallery:opacity-100 transition-all duration-300">
                  <div className="text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    <ChevronLeft size={40} strokeWidth={1.5} />
                  </div>
                  <div className="text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    <ChevronRight size={40} strokeWidth={1.5} />
                  </div>
                </div>
              </div>
              {/* Peça Única Badge */}
              <div className="absolute top-6 right-6">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
                  <Crown size={16} className="text-white fill-white/20" />
                  <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white">Peça Única</span>
                </div>
              </div>
            </div>
            {/* Gallery Thumbs Carousel */}
            <div className="relative group/thumbs pt-2">
              {productImages.length > 4 && (
                <>
                  <button 
                    onClick={() => scrollThumbnails('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md shadow-md flex items-center justify-center text-zinc-900 border border-zinc-100 opacity-0 group-hover/thumbs:opacity-100 transition-opacity"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => scrollThumbnails('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md shadow-md flex items-center justify-center text-zinc-900 border border-zinc-100 opacity-0 group-hover/thumbs:opacity-100 transition-opacity"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
              
              <div 
                ref={thumbnailRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide snap-x no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {productImages.map((img, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setActiveImageIndex(idx)}
                    className={`shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-zinc-50 overflow-hidden cursor-pointer border-2 transition-all duration-300 snap-start ${activeImageIndex === idx ? 'border-zinc-900 scale-105 shadow-md' : 'border-transparent hover:border-zinc-200 opacity-60'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt={`${product.nome} - ${idx + 1}`} />
                  </div>
                ))}
              </div>
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
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block">Cores Disponíveis</span>
                  {selectedVariant?.cor && (
                    <span className="text-xs font-bold text-zinc-900">{selectedVariant.cor}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {colors.map(cor => {
                    const isSelected = selectedVariant?.cor === cor;
                    return (
                      <button 
                        key={cor}
                        title={cor}
                        className={`w-10 h-10 rounded-full border-2 transition-all p-0.5 flex items-center justify-center ${
                          isSelected 
                            ? 'border-zinc-900 scale-110 shadow-md ring-2 ring-zinc-900 ring-offset-2' 
                            : 'border-zinc-100 hover:border-zinc-300'
                        }`}
                        onClick={() => {
                          const variant = product.variants?.find(v => v.cor === cor);
                          if (variant) setSelectedVariantId(variant.id);
                        }}
                      >
                        <div 
                          className="w-full h-full rounded-full shadow-inner"
                          style={{ background: getColorValue(cor) }}
                        />
                      </button>
                    );
                  })}
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

              {/* Add to Cart & Favorite */}
              <div className="pt-2 flex flex-row gap-3">
                <Button 
                  size="lg" 
                  onClick={handleAddToCart}
                  className="flex-1 h-16 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold flex items-center justify-center gap-3 shadow-xl border-none transition-all active:scale-95"
                  disabled={!selectedVariant || selectedVariant.quantidade_estoque <= 0}
                >
                  <ShoppingBag size={22} />
                  <span className="text-sm">Adicionar ao Carrinho</span>
                </Button>

                <button 
                  onClick={toggleFavorite}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all shadow-xl active:scale-95 ${
                    isFavorite 
                      ? 'bg-red-500 border-red-500 text-white shadow-red-200' 
                      : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 shadow-zinc-100'
                  }`}
                >
                   <Heart size={26} fill={isFavorite ? "currentColor" : "none"} />
                </button>
              </div>

              {/* Perks / Benefits Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 border-t border-zinc-100">
                 <div className="bg-zinc-800/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex flex-col items-center text-center justify-center min-h-[100px] group hover:bg-zinc-700/90 transition-all shadow-lg">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 mb-2 group-hover:scale-110 transition-transform">
                       <Truck size={16} />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-white uppercase tracking-[0.1em] leading-none">Entregas</p>
                       <p className="text-[9px] font-medium text-zinc-300 uppercase tracking-tighter line-clamp-2 px-1">Somente Leme - SP</p>
                    </div>
                 </div>

                 <div className="bg-zinc-800/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex flex-col items-center text-center justify-center min-h-[100px] group hover:bg-zinc-700/90 transition-all shadow-lg">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 mb-2 group-hover:scale-110 transition-transform">
                       <RotateCcw size={16} />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-white uppercase tracking-[0.1em] leading-none">Trocas</p>
                       <p className="text-[9px] font-medium text-zinc-300 uppercase tracking-tighter line-clamp-2 px-1">Até 15 dias</p>
                    </div>
                 </div>

                 <div className="bg-zinc-800/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex flex-col items-center text-center justify-center min-h-[100px] group hover:bg-zinc-700/90 transition-all shadow-lg">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 mb-2 group-hover:scale-110 transition-transform">
                       <ShieldCheck size={16} />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-white uppercase tracking-[0.1em] leading-none">Pgto. Seguro</p>
                       <p className="text-[9px] font-medium text-zinc-300 uppercase tracking-tighter line-clamp-2 px-1">Cartão ou PIX</p>
                    </div>
                 </div>

                 <a 
                   href="https://api.whatsapp.com/send?phone=5519997526144" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="bg-zinc-800/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex flex-col items-center text-center justify-center min-h-[100px] group hover:bg-zinc-700/90 transition-all shadow-lg"
                 >
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 mb-2 group-hover:scale-110 transition-transform">
                       <Phone size={16} />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-white uppercase tracking-[0.1em] leading-none">Dúvidas?</p>
                       <p className="text-[9px] font-medium text-zinc-300 uppercase tracking-tighter line-clamp-2 px-1">Falar na loja</p>
                    </div>
                 </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
    </div>
  );
};
