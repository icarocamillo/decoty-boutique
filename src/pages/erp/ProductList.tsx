import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/types';
import { PackagePlus, Search, Edit, ArrowUp, ArrowDown, ArrowUpDown, Filter, Settings, Check, Tag, Layers, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SIZES_LIST } from '@/constants';
import { Pagination } from '@/components/ui/Pagination';
import { backendService } from '@/services/backendService';
import { formatProductId } from '@/utils';

import { useData } from '@/contexts/DataContext';

type SortKey = keyof Product;

const CATEGORIES = [
  'Vestidos', 'Blusas', 'Camisas', 'Calças', 'Saias', 'Casacos', 'Jaquetas', 'Bermudas',
  'Pulseira', 'Brinco', 'Colar'
];
const MATERIALS = ['Malha', 'Tecido Plano', 'Bijuteria'];

export const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const { products, suppliers, refreshData } = useData();
  // State for Data & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  
  // State for UI
  // Inicializado para sempre mostrar por ID DECOTY decrescente por padrão
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'ui_id', direction: 'desc' });
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Marcas dos fornecedores vindas do contexto
  const brands = useMemo(() => {
    const supplierBrands = suppliers
      .map(s => s.fantasy_name)
      .filter((name): name is string => !!name && name.trim() !== '');
    
    return Array.from(new Set(supplierBrands)).sort();
  }, [suppliers]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrand, selectedCategory, selectedMaterial, selectedSize, itemsPerPage]);

  // State for Column Customization
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  
  const [visibleColumns, setVisibleColumns] = useState({
    visual_id: true,
    nome: true,
    sku: false,
    ean: false,
    categoria: true,
    tamanho: true,
    cor: true,
    tipo_material: false,
    preco_venda: true,
    estoque: true
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const visualId = formatProductId(p);
      const searchLower = searchTerm.toLowerCase();

      // Text Search
      const matchesSearch = 
        p.nome.toLowerCase().includes(searchLower) || 
        visualId.toLowerCase().includes(searchLower) ||
        p.variants?.some(v => v.sku.toLowerCase().includes(searchLower) || v.ean.toLowerCase().includes(searchLower));
      
      // Filter Matches
      const matchesBrand = selectedBrand ? p.marca === selectedBrand : true;
      const matchesCategory = selectedCategory ? p.categoria === selectedCategory : true;
      const matchesMaterial = selectedMaterial ? p.tipo_material === selectedMaterial : true;
      const matchesSize = selectedSize ? p.variants?.some(v => v.tamanho === selectedSize) : true;

      return matchesSearch && matchesBrand && matchesCategory && matchesMaterial && matchesSize;
    });

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any = (a as any)[sortConfig.key];
        let bVal: any = (b as any)[sortConfig.key];

        if (sortConfig.key === 'quantidade_estoque' as any) {
             aVal = a.variants?.reduce((sum, v) => sum + v.quantidade_estoque, 0) || 0;
             bVal = b.variants?.reduce((sum, v) => sum + v.quantidade_estoque, 0) || 0;
        }

        if (aVal === undefined || bVal === undefined) return 0;

        // Sort customizado para ID visual (usa ui_id como base)
        if (sortConfig.key === 'ui_id') {
           const idA = a.ui_id || 0;
           const idB = b.ui_id || 0;
           return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [products, searchTerm, selectedBrand, selectedCategory, selectedMaterial, selectedSize, sortConfig]);

  // Pagination Logic
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
    }
    return <ArrowUpDown size={14} className="ml-1 opacity-30" />;
  };

  const getStockStatus = (qty: number) => {
    if (qty === 0) return { variant: 'destructive' as const, label: '0 un' };
    if (qty <= 2) return { variant: 'warning' as const, label: `${qty} un` };
    return { variant: 'success' as const, label: `${qty} un` };
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
           <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Produtos Cadastrados</h2>
           <p className="text-zinc-500 dark:text-zinc-400">Gerencie seu catálogo de roupas</p>
        </div>
        <Button className="flex items-center gap-2 w-full sm:w-auto" onClick={() => navigate('/erp/products/new')}>
          <PackagePlus size={18} /> Cadastrar Produto
        </Button>
      </div>

      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
           
           <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-wrap">
             {/* Search */}
             <div className="relative w-full md:w-60">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por ID, Nome, SKU..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                 {/* Marca */}
                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={selectedBrand}
                     onChange={(e) => setSelectedBrand(e.target.value)}
                   >
                     <option value="">Marcas</option>
                     {brands.map(b => <option key={b} value={b}>{b}</option>)}
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>

                 {/* Categoria */}
                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={selectedCategory}
                     onChange={(e) => setSelectedCategory(e.target.value)}
                   >
                     <option value="">Categorias</option>
                     {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>

                 {/* Tamanho */}
                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={selectedSize}
                     onChange={(e) => setSelectedSize(e.target.value)}
                   >
                     <option value="">Tamanhos</option>
                     {SIZES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>

                 {/* Material */}
                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={selectedMaterial}
                     onChange={(e) => setSelectedMaterial(e.target.value)}
                   >
                     <option value="">Materiais</option>
                     {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>
              </div>
           </div>

           {/* Customization */}
           <div className="relative hidden xl:block" ref={columnMenuRef}>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)} 
                className="flex items-center gap-2 text-zinc-600 border-zinc-200 dark:border-zinc-700 dark:text-zinc-400"
              >
                <Settings size={16} /> Personalizar Colunas
              </Button>
              
              {isColumnMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 z-20 overflow-hidden animate-fade-in-up">
                  <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Exibir Colunas</span>
                  </div>
                  <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                    {[
                      { key: 'visual_id', label: 'ID do Produto' },
                      { key: 'nome', label: 'Produto' },
                      { key: 'sku', label: 'SKU' },
                      { key: 'ean', label: 'EAN' },
                      { key: 'categoria', label: 'Categoria' },
                      { key: 'tamanho', label: 'Tamanho' },
                      { key: 'cor', label: 'Cor' },
                      { key: 'tipo_material', label: 'Material' },
                      { key: 'preco_venda', label: 'Preço Venda' },
                      { key: 'estoque', label: 'Estoque' },
                    ].map((col) => (
                      <button
                        key={col.key}
                        onClick={() => toggleColumn(col.key as keyof typeof visibleColumns)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded transition-colors"
                      >
                        <span>{col.label}</span>
                        {visibleColumns[col.key as keyof typeof visibleColumns] && <Check size={14} className="text-green-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
           </div>
        </div>

        {/* MOBILE VIEW: Card List */}
        <div className="flex flex-col gap-3 sm:hidden p-4 bg-zinc-50 dark:bg-zinc-950/50">
          {currentProducts.map((product) => {
            const stock = getStockStatus(product.quantidade_estoque);
            const visualId = formatProductId(product);

            return (
              <button 
                key={product.id} 
                onClick={() => navigate(`/erp/products/update/${product.ui_id}`)}
                className="text-left p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm active:scale-[0.98] transition-all flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      {visualId}
                    </span>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base mt-1 truncate">
                      {product.nome}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-medium text-zinc-500 uppercase">{product.marca}</span>
                      <span className="text-zinc-300">•</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{product.tamanho}</Badge>
                    </div>
                  </div>
                  <Badge variant={stock.variant} className="text-[10px] shrink-0 font-bold">
                    {stock.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-zinc-500 dark:text-zinc-400 border-y border-zinc-50 dark:border-zinc-800/50 py-2">
                  <div className="flex items-center gap-1">
                    <Tag size={12} className="text-zinc-400" />
                    <span>{product.categoria}</span>
                  </div>
                  {product.cor && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full border border-zinc-200 dark:border-zinc-700" style={{ backgroundColor: '#cbd5e1' }} />
                      <span>{product.cor}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-tight">Preço Venda</span>
                    <span className="text-lg font-black text-zinc-900 dark:text-white leading-none">
                      {formatCurrency(product.preco_venda)}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-zinc-300" />
                </div>
              </button>
            );
          })}
          {currentProducts.length === 0 && (
            <div className="py-12 text-center text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
               Nenhum produto encontrado.
            </div>
          )}
        </div>

        {/* DESKTOP VIEW: Standard Table */}
        <div className="hidden sm:block overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                {visibleColumns.visual_id && (
                  <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap" onClick={() => handleSort('ui_id')}>
                    <div className="flex items-center">ID Decoty <SortIcon columnKey="ui_id" /></div>
                  </th>
                )}
                {visibleColumns.nome && (
                  <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('nome')}>
                    <div className="flex items-center">Produto <SortIcon columnKey="nome" /></div>
                  </th>
                )}
                {visibleColumns.sku && (
                  <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('sku' as any)}>
                    <div className="flex items-center">SKU <SortIcon columnKey={"sku" as any} /></div>
                  </th>
                )}
                {visibleColumns.ean && (
                  <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('ean' as any)}>
                    <div className="flex items-center">EAN <SortIcon columnKey={"ean" as any} /></div>
                  </th>
                )}
                {visibleColumns.categoria && (
                  <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('categoria')}>
                    <div className="flex items-center">Categoria <SortIcon columnKey="categoria" /></div>
                  </th>
                )}
                {visibleColumns.tamanho && (
                  <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-center" onClick={() => handleSort('tamanho' as any)}>
                    <div className="flex items-center justify-center">Tam. <SortIcon columnKey={"tamanho" as any} /></div>
                  </th>
                )}
                {visibleColumns.cor && (
                  <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('cor' as any)}>
                    <div className="flex items-center">Cor <SortIcon columnKey={"cor" as any} /></div>
                  </th>
                )}
                 {visibleColumns.tipo_material && (
                  <th className="px-4 py-3 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('tipo_material')}>
                    <div className="flex items-center">Material <SortIcon columnKey="tipo_material" /></div>
                  </th>
                )}
                {visibleColumns.preco_venda && (
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('preco_venda' as any)}>
                    <div className="flex items-center justify-end">Preço Venda <SortIcon columnKey={"preco_venda" as any} /></div>
                  </th>
                )}
                {visibleColumns.estoque && (
                  <th className="px-4 py-3 font-medium text-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('quantidade_estoque' as any)}>
                     <div className="flex items-center justify-center">Estoque <SortIcon columnKey={"quantidade_estoque" as any} /></div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {currentProducts.map((product) => {
                const totalStock = product.variants?.reduce((sum, v) => sum + v.quantidade_estoque, 0) || 0;
                const stock = getStockStatus(totalStock);
                
                // Pegar valores das variantes para exibição rápida
                const prices = (Array.from(new Set(product.variants?.map(v => v.preco_venda) || [])) as number[]).filter(p => typeof p === 'number');
                const displayPrice = prices.length > 1 ? Math.min(...prices) : (prices[0] || 0);
                const isPriceRange = prices.length > 1;

                const sizes = Array.from(new Set(product.variants?.map(v => v.tamanho) || []));
                const colors = Array.from(new Set(product.variants?.map(v => v.cor) || []));

                const firstSku = product.variants?.[0]?.sku || '-';
                const firstEan = product.variants?.[0]?.ean || '-';
                
                return (
                  <tr 
                    key={product.id} 
                    onClick={() => navigate(`/erp/products/update/${product.ui_id}`)}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                  >
                    {/* ID Formatado: ui_id-MARCA (Caixa Alta) */}
                    {visibleColumns.visual_id && (
                      <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100 font-bold font-mono text-xs whitespace-nowrap">
                        {formatProductId(product)}
                      </td>
                    )}
                    
                    {/* Produto */}
                    {visibleColumns.nome && (
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-900 dark:text-white text-sm truncate max-w-[200px]">{product.nome}</span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{product.marca}</span>
                        </div>
                      </td>
                    )}

                     {/* SKU */}
                    {visibleColumns.sku && (
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                         <div className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded w-fit whitespace-nowrap">
                           {firstSku}{product.variants && product.variants.length > 1 ? '...' : ''}
                         </div>
                      </td>
                    )}

                    {/* EAN */}
                    {visibleColumns.ean && (
                      <td className="px-4 py-2 text-zinc-500 dark:text-zinc-500 text-[11px] font-mono">
                         {firstEan}{product.variants && product.variants.length > 1 ? '...' : ''}
                      </td>
                    )}

                    {/* Categoria */}
                    {visibleColumns.categoria && (
                      <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                          {product.categoria}
                      </td>
                    )}

                    {/* Tamanho */}
                    {visibleColumns.tamanho && (
                      <td className="px-4 py-2 text-center">
                        <Badge variant="outline">
                          {sizes.length > 1 ? `${sizes.length} tam.` : (sizes[0] || '-')}
                        </Badge>
                      </td>
                    )}

                     {/* Cor */}
                    {visibleColumns.cor && (
                      <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[100px]" title={colors.join(', ')}>
                        {colors.length > 1 ? 'Várias' : (colors[0] || '-')}
                      </td>
                    )}

                     {/* Material */}
                    {visibleColumns.tipo_material && (
                      <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {product.tipo_material}
                      </td>
                    )}

                    {/* Preço Venda */}
                    {visibleColumns.preco_venda && (
                      <td className="px-4 py-2 text-right font-medium text-zinc-900 dark:text-white">
                        {isPriceRange && <span className="text-[10px] text-zinc-400 mr-1">a partir</span>}
                        {formatCurrency(displayPrice)}
                      </td>
                    )}

                    {/* Estoque */}
                    {visibleColumns.estoque && (
                      <td className="px-4 py-2 text-center">
                        <Badge variant={stock.variant}>
                          {stock.label}
                        </Badge>
                      </td>
                    )}
                  </tr>
                );
              })}
              {currentProducts.length === 0 && (
                 <tr>
                    <td colSpan={10} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                      Nenhum produto encontrado com os filtros atuais.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalItems > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </Card>
    </div>
  );
};