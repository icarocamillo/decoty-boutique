import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { getColorValue } from '@/utils/colorUtils';

// Detecta propriedades cromáticas/HSL para ordenar e agrupar por similaridade
const getColorHueAndDetails = (colorName: string) => {
  const hexOrVal = getColorValue(colorName);
  
  if (!hexOrVal.startsWith('#')) {
    if (colorName.toLowerCase() === 'multicor' || colorName.toLowerCase() === 'multicolor') {
      return { h: 360, s: 100, l: 50, isAchromatic: false, isMulticolor: true };
    }
    return { h: 0, s: 0, l: 50, isAchromatic: true, isMulticolor: false };
  }

  const hex = hexOrVal.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hue = Math.round(h * 360);
  const sat = Math.round(s * 100);
  const light = Math.round(l * 100);

  // Considerar cinza/preto/branco/off-white (tons acromáticos) se a saturação for muito baixa (< 12) ou luminosidade extrema (< 12 ou > 88)
  const isAchromatic = sat < 12 || light < 12 || light > 88;

  return { h: hue, s: sat, l: light, isAchromatic, isMulticolor: false };
};

const sortColorsBySimilarity = (colorList: string[]) => {
  return [...colorList].sort((a, b) => {
    const infoA = getColorHueAndDetails(a);
    const infoB = getColorHueAndDetails(b);

    // 1. Multicor sempre por último
    if (infoA.isMulticolor && !infoB.isMulticolor) return 1;
    if (!infoA.isMulticolor && infoB.isMulticolor) return -1;

    // 2. Acromáticas (neutras) vão no final das cores normais (antes de Multicor)
    if (infoA.isAchromatic && !infoB.isAchromatic) return 1;
    if (!infoA.isAchromatic && infoB.isAchromatic) return -1;

    if (infoA.isAchromatic && infoB.isAchromatic) {
      // Ordena acromáticos do mais brilhante (Branco/Gelo/Off-White) para o mais escuro (Cinza, Preto)
      return infoB.l - infoA.l;
    }

    // 3. Cromáticas normais: ordena pelo círculo cromático (matiz / hue)
    if (infoA.h !== infoB.h) {
      return infoA.h - infoB.h;
    }

    // 4. Critérios de desempate: saturação e depois luminosidade
    if (infoA.s !== infoB.s) {
      return infoB.s - infoA.s;
    }
    return infoB.l - infoA.l;
  });
};

interface FilterSidebarProps {
  categories: string[];
  colors: string[];
  sizes: string[];
  activeFilters: {
    category: string[];
    color: string[];
    size: string[];
    minPrice: number;
    maxPrice: number;
  };
  onFilterChange: (type: 'category' | 'color' | 'size', value: string) => void;
  onPriceChange: (min: number, max: number) => void;
  onClearFilters: () => void;
  onCloseMobile?: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categories,
  colors,
  sizes,
  activeFilters,
  onFilterChange,
  onPriceChange,
  onClearFilters,
  onCloseMobile
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    category: true,
    color: true,
    size: true,
    price: true
  });

  const sortedColors = useMemo(() => {
    return sortColorsBySimilarity(colors);
  }, [colors]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionTitle: React.FC<{ id: string; title: string }> = ({ id, title }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between py-4 text-xs font-bold uppercase tracking-widest text-zinc-900 border-b border-zinc-100"
    >
      {title}
      {openSections[id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );

  return (
    <div className="flex flex-col h-full px-4">
      <div className="flex items-center justify-between lg:mb-8 mb-4">
        <h2 className="text-xl font-serif text-zinc-900">Filtrar</h2>
        <button 
          onClick={onClearFilters}
          className="text-[10px] uppercase font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
        >
          Limpar Tudo
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar pb-20 lg:pb-4">
        {/* Categorias */}
        <div>
          <SectionTitle id="category" title="Departamento" />
          {openSections.category && (
            <div className="pt-4 space-y-2">
              {categories.map((cat) => (
                <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={activeFilters.category.includes(cat)}
                      onChange={() => onFilterChange('category', cat)}
                      className="peer appearance-none w-4 h-4 border border-zinc-300 rounded-sm checked:bg-zinc-900 checked:border-zinc-900 transition-all cursor-pointer"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 text-white pointer-events-none">
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-2.5 h-2.5">
                         <path d="M20 6L9 17l-5-5" />
                       </svg>
                    </div>
                  </div>
                  <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">{cat}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Cores */}
        <div>
          <SectionTitle id="color" title="Cores" />
          {openSections.color && (
            <div className="pt-4 grid grid-cols-5 gap-y-4 gap-x-2 px-1.5 pb-2">
              {sortedColors.map((color) => {
                const isActive = activeFilters.color.includes(color);
                return (
                  <button
                    key={color}
                    onClick={() => onFilterChange('color', color)}
                    title={color}
                    className={`w-8 h-8 rounded-full border border-zinc-200 p-0.5 transition-all ${isActive ? 'ring-2 ring-zinc-900 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                  >
                    <div 
                      className="w-full h-full rounded-full shadow-inner" 
                      style={{ 
                        background: getColorValue(color)
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tamanhos */}
        <div>
          <SectionTitle id="size" title="Tamanho" />
          {openSections.size && (
            <div className="pt-4 flex flex-wrap gap-2">
              {sizes.map((size) => {
                const isActive = activeFilters.size.includes(size);
                return (
                  <button
                    key={size}
                    onClick={() => onFilterChange('size', size)}
                    className={`min-w-[40px] px-2 h-10 border text-[11px] font-bold uppercase transition-all flex items-center justify-center rounded-sm
                      ${isActive ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-900'}
                    `}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Faixa de Preço */}
        <div>
          <SectionTitle id="price" title="Faixa de Preço" />
          {openSections.price && (
            <div className="pt-6 px-2">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-4 uppercase">
                <span>Min: R$ {activeFilters.minPrice}</span>
                <span>Max: R$ {activeFilters.maxPrice}</span>
              </div>
              <input 
                type="range"
                min="0"
                max="2000"
                step="50"
                value={activeFilters.maxPrice}
                onChange={(e) => onPriceChange(activeFilters.minPrice, parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-900"
              />
            </div>
          )}
        </div>
      </div>

      {onCloseMobile && (
        <div className="absolute bottom-6 left-6 right-6 lg:hidden">
          <button
            onClick={onCloseMobile}
            className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl uppercase tracking-widest text-xs shadow-lg"
          >
            Ver Resultados
          </button>
        </div>
      )}
    </div>
  );
};
