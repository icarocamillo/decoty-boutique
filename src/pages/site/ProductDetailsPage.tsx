import React, { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProductCard } from '@/components/site/ProductCard';
import { ShoppingBag, ChevronLeft, ChevronRight, Star, ShieldCheck, Truck, RotateCcw, Ruler, Crown, Heart, MessageCircle, Phone, Plus, Sparkles, Share2 } from 'lucide-react';
import { SizeGuideModal } from '@/components/site/SizeGuideModal';
import { ShareProductModal } from '@/components/site/ShareProductModal';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { getColorValue } from '@/utils/colorUtils';
import { backendService } from '@/services/backendService';
import { Product } from '@/types';
import { getDisplayBrand } from '@/utils/brand';

export const ProductDetailsPage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const { products, isLoading, favoriteIds, toggleFavorite: backendToggleFavorite, suppliers } = useData();
  const { addToCart } = useCart();
  const { user } = useAuth();
  
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [productCombinations, setProductCombinations] = useState<any[]>([]);
  const [loadingCombinations, setLoadingCombinations] = useState(false);
  const similarCarouselRef = useRef<HTMLDivElement>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    if (e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const diffX = touchEndX - touchStartX.current;
      const diffY = touchEndY - touchStartY.current;

      const minSwipeDistance = 50; // pixels
      // Certifica de que o movimento horizontal foi predominante em relação ao vertical
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > minSwipeDistance) {
          if (diffX > 0) {
            // Swipe para a direita: imagem anterior
            setActiveImageIndex(prev => (prev === 0 ? productImages.length - 1 : prev - 1));
          } else {
            // Swipe para a esquerda: próxima imagem
            setActiveImageIndex(prev => (prev === productImages.length - 1 ? 0 : prev + 1));
          }
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const scrollSimilar = (direction: 'left' | 'right') => {
    if (similarCarouselRef.current) {
      const scrollAmount = similarCarouselRef.current.clientWidth * 0.8;
      similarCarouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

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
    
    return foundProduct;
  }, [identifier, products]);

  const supplierForProduct = useMemo(() => {
    if (!product || !suppliers) return null;
    return suppliers.find(s => s.fantasy_name === product.marca || s.nome_empresa === product.marca);
  }, [product, suppliers]);

  const supplierRating = useMemo(() => {
    if (!product) return null;
    const displayBrand = getDisplayBrand(product.marca, suppliers);
    if (displayBrand === 'Decoty') {
      return 5;
    }
    if (!supplierForProduct || typeof supplierForProduct.stars !== 'number' || supplierForProduct.stars <= 0) return null;
    return supplierForProduct.stars;
  }, [product, suppliers, supplierForProduct]);

  const renderPartialStars = (rating: number, size: number = 14) => {
    return (
      <div className="flex items-center gap-0.5" title={`Nota: ${rating}`}>
        {[1, 2, 3, 4, 5].map((starVal) => {
          const diff = rating - (starVal - 1);
          const fillPercentage = Math.min(Math.max(diff * 100, 0), 100);

          return (
            <div 
              key={starVal} 
              className="relative inline-block" 
              style={{ width: size, height: size }}
            >
              <Star
                size={size}
                className="text-zinc-200 dark:text-zinc-700/50 absolute top-0 left-0"
              />
              {fillPercentage > 0 && (
                <div
                  className="absolute top-0 left-0 overflow-hidden"
                  style={{ width: `${fillPercentage}%`, height: '100%' }}
                >
                  <Star
                    size={size}
                    className="fill-amber-500 text-amber-500 absolute top-0 left-0"
                    style={{ width: size, minWidth: size, maxWidth: size }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleAddToCart = () => {
    if (product && selectedVariant) {
      addToCart(product, selectedVariant, 1);
    }
  };

  const [searchParams] = useSearchParams();
  const initialColor = searchParams.get('cor');

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Resetar estados quando o produto mudar para evitar persistência de dados do produto anterior (caso de navegação entre produtos na mesma rota)
  React.useEffect(() => {
    setSelectedVariantId(null);
    setActiveImageIndex(0);
  }, [identifier]);

  // Selecionar variante inicial baseada no parâmetro de cor ou na foto principal do catálogo
  React.useEffect(() => {
    if (product && product.variants && !selectedVariantId) {
      // 1. Extrair cores que REALMENTE possuem fotos vinculadas
      const colorsWithPhotos = Array.from(new Set(
        product.images?.filter(img => img.cor).map(img => img.cor) || []
      ));

      if (initialColor) {
        // Se a cor inicial tem fotos, seleciona ela
        if (colorsWithPhotos.includes(initialColor)) {
          const variantByColor = product.variants.find(v => v.cor === initialColor);
          if (variantByColor) {
            setSelectedVariantId(variantByColor.id);
            return;
          }
        }
      }
      
      // Fallback 1: Cor da foto principal do catálogo (se houver cor vinculada a essa foto)
      const mainImage = product.images?.find(img => img.is_default_product_photo);
      if (mainImage && mainImage.cor) {
        const variantByMainImg = product.variants.find(v => v.cor === mainImage.cor);
        if (variantByMainImg) {
          setSelectedVariantId(variantByMainImg.id);
          return;
        }
      }

      // Fallback 2: Primeira variante que tenha uma cor com fotos
      const firstVariantWithPhoto = product.variants.find(v => v.cor && colorsWithPhotos.includes(v.cor));
      if (firstVariantWithPhoto) {
        setSelectedVariantId(firstVariantWithPhoto.id);
        return;
      }

      // Fallback 3: Qualquer variante (caso não existam fotos vinculadas a cores ainda)
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

  const isFavorite = useMemo(() => {
    if (!product) return false;
    const favKey = selectedVariant?.cor ? `${product.id}:${selectedVariant.cor}` : product.id;
    return favoriteIds.includes(favKey);
  }, [product, selectedVariant?.cor, favoriteIds]);

  const toggleFavorite = async () => {
    if (!user) {
      alert('Você precisa estar logada para favoritar uma peça. Faça login para salvar seus favoritos!');
      return;
    }

    if (!product) return;

    await backendToggleFavorite(product.id, selectedVariant?.cor);
  };

  // Buscar combinações quando o produto ou a cor selecionada mudar
  React.useEffect(() => {
    if (product?.id && selectedVariant?.cor) {
      setLoadingCombinations(true);
      backendService.getColorCombinations(product.id, selectedVariant.cor)
        .then(setProductCombinations)
        .finally(() => setLoadingCombinations(false));
    } else {
      setProductCombinations([]);
    }
  }, [product?.id, selectedVariant?.cor]);

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

  const colors = useMemo(() => {
    if (!product || !product.variants) return [];
    
    // Pegamos todas as cores das variantes únicas
    const allColors = Array.from(new Set(product.variants.map(v => v.cor || '').filter(Boolean))) as string[];
    
    // Filtramos para mostrar apenas cores que possuem pelo menos uma imagem vinculada
    return allColors.filter(cor => 
      product.images?.some(img => img.cor === cor)
    );
  }, [product]);

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

  if (!product || !product.show_on_site) {
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

        <div className="lg:hidden mb-10">
          <h1 className="text-3xl font-serif text-zinc-950 mb-1">{product.nome}</h1>
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline" className="rounded-full border-zinc-200 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
              {getDisplayBrand(product.marca, suppliers)}
            </Badge>
            {supplierRating !== null && (
              <div className="flex items-center gap-1.5">
                {renderPartialStars(supplierRating, 12)}
                <span className="text-zinc-400 text-xs font-medium font-sans">
                  ({supplierRating.toFixed(1)})
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Referência: Decoty-{product.ui_id}</p>
            {product.is_unique_piece && (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-2 py-0.5 rounded-full flex items-center gap-1 text-[8px] font-black uppercase tracking-widest">
                <Crown size={10} className="fill-amber-700" />
                Peça Única
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
          {/* Gallery Placeholder */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div 
              className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-100 shadow-2xl group/gallery touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Main Image */}
              <motion.img 
                key={activeImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={productImages[activeImageIndex]} 
                alt={product.nome}
                className="w-full h-full object-cover select-none"
              />

              {/* Navigation Arrows & Click Handlers (PC only) */}
              <div className="hidden lg:block absolute inset-0 z-20 pointer-events-none">
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

                {/* Arrow Icons - hover on desktop */}
                <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover/gallery:opacity-100 transition-all duration-300">
                  <div className="text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    <ChevronLeft size={40} strokeWidth={1.5} />
                  </div>
                  <div className="text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    <ChevronRight size={40} strokeWidth={1.5} />
                  </div>
                </div>
              </div>

              {/* Photo Counter */}
              <div className="absolute top-6 left-6 z-10">
                <div className="bg-white/80 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full shadow-xl">
                  <span className="text-[10px] font-bold text-zinc-900 leading-none whitespace-nowrap flex items-center justify-center min-w-[32px]">
                    {activeImageIndex + 1} / {productImages.length}
                  </span>
                </div>
              </div>

              {/* Gallery Actions (Favorite + Share) */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 flex flex-col gap-2 sm:gap-3 items-center">
                {/* Toggle Favorite Heart Button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(); }}
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 ${
                    isFavorite 
                      ? 'bg-red-500 text-white' 
                      : 'bg-white/80 backdrop-blur-md text-zinc-400 hover:text-red-500'
                  }`}
                >
                  <Heart size={18} className="sm:w-5 sm:h-5" fill={isFavorite ? "currentColor" : "none"} />
                </button>

                {/* Share Button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 bg-white/80 backdrop-blur-md text-zinc-400 hover:text-zinc-900"
                >
                  <Share2 size={18} className="sm:w-5 sm:h-5" />
                </button>
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
                className="flex gap-3 overflow-x-auto overflow-y-hidden touch-pan-x scrollbar-hide snap-x no-scrollbar"
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
            <div className="mb-8 hidden lg:block">
              <h1 className="text-4xl md:text-5xl font-serif text-zinc-950 mb-2">{product.nome}</h1>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="rounded-full border-zinc-200 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                  {getDisplayBrand(product.marca, suppliers)}
                </Badge>
                {supplierRating !== null && (
                  <div className="flex items-center gap-1.5">
                    {renderPartialStars(supplierRating, 14)}
                    <span className="text-zinc-400 text-sm font-medium font-sans">
                      ({supplierRating.toFixed(1)})
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mb-4">
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Referência: Decoty-{product.ui_id}</p>
                {product.is_unique_piece && (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em]">
                    <Crown size={12} className="fill-amber-700" />
                    Peça Única
                  </Badge>
                )}
              </div>
              
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

            {/* Mobile Price (shows only on mobile since the desktop title block is hidden) */}
            <div className="lg:hidden mb-8">
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

              {/* Add to Cart */}
              <div className="pt-2 flex flex-row">
                <Button 
                  variant="success"
                  size="lg" 
                  onClick={handleAddToCart}
                  className="flex-1 h-16 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl border-none transition-all active:scale-95"
                  disabled={!selectedVariant || selectedVariant.quantidade_estoque <= 0}
                >
                  <ShoppingBag size={22} />
                  <span className="text-sm">Adicionar ao Carrinho</span>
                </Button>
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

      {/* Seção Complete o Look */}
      {productCombinations.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in border-t border-zinc-100 dark:border-zinc-800/50 mt-2">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-zinc-900 dark:text-zinc-100" />
              <Badge variant="outline" className="border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold tracking-[0.2em] px-5 py-1.5 text-[10px] uppercase">LOOK COMPLETO</Badge>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white mb-4 tracking-tighter">Gostou do Conjunto?</h2>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg">Estas peças combinam perfeitamente com sua escolha atual.</p>
          </div>

          <div className="space-y-12">
            {productCombinations.map((combo) => {
              const combinedProduct = combo.product;
              const combinedColor = combo.cor;
              
              if (!combinedProduct) return null;

              // Fotos
              const currentImg = product?.images?.find(img => img.cor === selectedVariant?.cor && img.is_main)?.url ||
                                product?.images?.find(img => img.cor === selectedVariant?.cor)?.url ||
                                productImages[0];

              const mainImg = combinedProduct.images?.find((img: any) => img.cor === combinedColor && (img.is_main || img.is_default_product_photo))?.url ||
                             combinedProduct.images?.find((img: any) => img.cor === combinedColor)?.url ||
                             combinedProduct.images?.find((img: any) => img.is_default_product_photo)?.url || 
                             combinedProduct.images?.[0]?.url;
              
              // RESOLUÇÃO DE PREÇO: Pegar a variação mais recente (maior UI_ID) desta cor específica
              const variantsOfThisColor = combinedProduct.variants?.filter((v: any) => v.cor === combinedColor) || [];
              const combinedVariant = variantsOfThisColor.length > 0 
                ? [...variantsOfThisColor].sort((a: any, b: any) => (b.ui_id || 0) - (a.ui_id || 0))[0]
                : combinedProduct.variants?.[0];

              const priceVenda = combinedVariant?.preco_venda || 0;
              const currentPrice = selectedVariant?.preco_venda || 0;
              const totalPrice = currentPrice + priceVenda;

              const targetUrl = `/produto/${combinedProduct.slug}-${combinedProduct.ui_id}?cor=${encodeURIComponent(combinedColor)}`;

              return (
                <div key={`${combinedProduct.id}-${combinedColor}`} className="relative">
                  {/* Layout Desktop/Tablet */}
                  <div className="hidden md:flex items-start justify-center gap-12 lg:gap-24">
                    {/* Produto Atual */}
                    <div className="flex-1 max-w-sm space-y-6">
                      <div className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-xl border border-zinc-100 dark:border-zinc-800 group cursor-default">
                        <Badge className="absolute top-6 left-6 z-10 !bg-emerald-500 text-white border-none px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-lg">
                          VOCÊ ESTÁ VENDO
                        </Badge>
                        <img 
                          src={currentImg} 
                          alt={product.nome}
                          className="w-full h-full object-cover grayscale-[0.2]"
                        />
                      </div>
                      <div className="px-2">
                        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-1">{getDisplayBrand(product.marca, suppliers)}</p>
                        <h4 className="text-xl font-bold text-zinc-950 dark:text-white uppercase tracking-tight">{product.nome}</h4>
                        <div className="mt-3">
                          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(currentPrice)}</p>
                        </div>
                      </div>
                    </div>

                    {/* CENTRAL COLUMN */}
                    <div className="flex flex-col items-center justify-start pt-32 gap-8 w-64 lg:w-80 shrink-0">
                      <div className="opacity-100">
                        <Plus size={48} strokeWidth={1} className="text-black dark:text-white" />
                      </div>
                      
                      <div className="bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-xl w-full text-center space-y-6">
                         <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">VALOR ESTIMADO DO LOOK</p>
                            <p className="text-4xl font-black text-zinc-900 dark:text-white leading-none tracking-tighter">{formatCurrency(totalPrice)}</p>
                            <p className="text-xs text-zinc-500 font-medium mt-2 leading-relaxed">Combine as peças e economize tempo na escolha do seu visual.</p>
                         </div>
                         <Button 
                            className="w-full bg-zinc-900 dark:bg-emerald-600 text-white hover:bg-zinc-800 dark:hover:bg-emerald-700 h-14 rounded-2xl font-bold text-sm tracking-wide shadow-lg transition-transform active:scale-95"
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                navigate(targetUrl);
                            }}
                         >
                            VER ESTE LOOK
                         </Button>
                      </div>
                    </div>

                    {/* Produto Combinado */}
                    <div className="flex-1 max-w-sm space-y-6">
                      <motion.div 
                        whileHover={{ y: -10 }}
                        className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-xl border border-zinc-100 dark:border-zinc-800 group cursor-pointer"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          navigate(targetUrl);
                        }}
                      >
                        <Badge className="absolute top-6 left-6 z-10 bg-zinc-900/90 backdrop-blur-md text-white border-none px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-lg">
                          SUGESTÃO DE LOOK
                        </Badge>
                        <img 
                          src={mainImg} 
                          alt={combinedProduct.nome}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </motion.div>
                      <div className="px-2">
                        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-1">{getDisplayBrand(combinedProduct.marca, suppliers)}</p>
                        <h4 className="text-xl font-bold text-zinc-950 dark:text-white uppercase tracking-tight">{combinedProduct.nome} ({combinedColor})</h4>
                        <div className="mt-3">
                          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(priceVenda)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Layout Mobile */}
                  <div className="md:hidden">
                    <motion.div 
                      key={`${combinedProduct.id}-${combinedColor}`}
                      whileHover={{ y: -8 }}
                      className="group relative flex flex-col bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500"
                    >
                      <div className="aspect-[4/5] relative overflow-hidden bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center p-2">
                        <div className="flex items-center gap-2 w-full h-full">
                           <div className="flex-1 h-full relative overflow-hidden rounded-2xl shadow-sm border border-white/50 dark:border-zinc-700/50 grayscale-[0.3]">
                              <div className="absolute inset-0 bg-black/5 z-10" />
                              <div className="absolute top-2 left-2 z-20 !bg-emerald-500 px-1.5 py-0.5 rounded-lg shadow-sm">
                                 <p className="text-[7px] font-black text-white uppercase">VOCÊ ESTÁ VENDO</p>
                              </div>
                              <img src={currentImg} alt="Peça atual" className="w-full h-full object-cover" />
                           </div>
                           <div className="flex items-center justify-center">
                              <Plus size={20} className="text-black dark:text-white" />
                           </div>
                           <div 
                             className="flex-1 h-full relative overflow-hidden rounded-2xl shadow-sm border border-white/50 dark:border-zinc-700/50 cursor-pointer"
                             onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                navigate(targetUrl);
                             }}
                           >
                              <div className="absolute top-2 left-2 z-20 bg-zinc-900/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg shadow-sm">
                                 <p className="text-[7px] font-black text-white uppercase">SUGESTÃO DE LOOK</p>
                              </div>
                              <img src={mainImg} alt={combinedProduct.nome} className="w-full h-full object-cover" />
                           </div>
                        </div>
                        
                        <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 z-20">
                          <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between shadow-2xl">
                            <div>
                               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Look Sugerido</p>
                               <p className="text-lg font-black text-zinc-900">{formatCurrency(totalPrice)}</p>
                            </div>
                            <Button size="sm" className="bg-zinc-900 text-white rounded-xl font-bold px-4 h-10" onClick={() => navigate(targetUrl)}>
                              Ver look
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex justify-between items-center mb-3">
                           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{getDisplayBrand(combinedProduct.marca, suppliers)}</p>
                           <Badge className="bg-zinc-900 !text-white border-none text-[9px] font-bold">{combinedColor}</Badge>
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 transition-colors uppercase tracking-tight leading-tight">{combinedProduct.nome}</h3>
                      </div>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Seção Produtos Similares */}
      {(() => {
        const similarProductsRaw = products
          .filter(p => p.categoria === product.categoria && p.id !== product.id && p.show_on_site);

        // Expandir por cor para respeitar a imagem principal da cor conforme solicitado
        const expandedSimilar: { displayId: string; product: any; preferredColor?: string }[] = [];
        
        similarProductsRaw.forEach(p => {
          const colorsInProduct = Array.from(new Set(p.variants?.map(v => v.cor))).filter(Boolean) as string[];
          
          if (colorsInProduct.length === 0) {
            expandedSimilar.push({ displayId: p.id, product: p });
          } else {
            colorsInProduct.forEach(color => {
              const hasStock = p.variants?.some(v => v.cor === color && v.quantidade_estoque > 0);
              if (hasStock) {
                expandedSimilar.push({
                  displayId: `${p.id}-${color}`,
                  product: p,
                  preferredColor: color
                });
              }
            });
          }
        });

        const displaySimilar = expandedSimilar.slice(0, 12);

        if (displaySimilar.length === 0) return null;

        return (
          <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-zinc-100 dark:border-zinc-800/50 mt-2">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-6">
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-zinc-900 dark:text-zinc-100" />
                  <Badge variant="outline" className="border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold tracking-[0.2em] px-5 py-1.5 text-[10px] uppercase">VOCÊ TAMBÉM PODE GOSTAR</Badge>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white mb-2 tracking-tighter">Produtos Similares</h2>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg">Outras {product.categoria} que combinam com você.</p>
              </div>
            </div>

            <div className="relative px-1">
              {/* Botões de Navegação - Sempre visíveis e centrados nas fotos */}
              <button 
                onClick={() => scrollSimilar('left')}
                className="absolute left-2 md:left-4 top-[40%] md:top-[32%] -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-900 hover:text-white dark:hover:bg-emerald-600 transition-all active:scale-90 shadow-xl"
                aria-label="Anterior"
              >
                <ChevronLeft size={24} />
              </button>
              
              <button 
                onClick={() => scrollSimilar('right')}
                className="absolute right-2 md:right-4 top-[40%] md:top-[32%] -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-900 hover:text-white dark:hover:bg-emerald-600 transition-all active:scale-90 shadow-xl"
                aria-label="Próximo"
              >
                <ChevronRight size={24} />
              </button>

              <div 
                ref={similarCarouselRef}
                className="flex gap-4 md:gap-5 overflow-x-auto overflow-y-hidden touch-pan-x pb-4 snap-x no-scrollbar scroll-smooth"
              >
                {displaySimilar.map((item) => (
                  <div key={item.displayId} className="w-[170px] md:w-[200px] lg:w-[220px] shrink-0 snap-start flex flex-col">
                    <ProductCard product={item.product} preferredColor={item.preferredColor} />
                  </div>
                ))}
              </div>
              
              {/* Sombras de indicação de scroll - Suaves */}
              <div className="absolute top-0 right-0 bottom-4 w-12 bg-gradient-to-l from-white dark:from-zinc-950 to-transparent pointer-events-none" />
              <div className="absolute top-0 left-0 bottom-4 w-12 bg-gradient-to-r from-white dark:from-zinc-950 to-transparent pointer-events-none" />
            </div>
          </section>
        );
      })()}

      <SizeGuideModal 
        isOpen={isSizeGuideOpen} 
        onClose={() => setIsSizeGuideOpen(false)} 
        category={product.categoria} 
      />

      <ShareProductModal 
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        product={product}
        preferredColor={selectedVariant?.cor}
      />
    </div>
  );
};
