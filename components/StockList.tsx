import React, { useState, useMemo, useEffect } from 'react';
import { StockEntry, Product, UserProfile, Sale } from '../types';
import { ArrowDownCircle, ArrowUpCircle, Package, Archive, Search, Filter, User, Shirt, Undo2, Loader2, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { Pagination } from './ui/Pagination';
import { SIZES_LIST } from '../constants';
import { formatDateStandard, formatProductId } from '../utils';
import { backendService } from '../services/backendService';
import { useNavigate } from 'react-router-dom';

import { useData } from '../contexts/DataContext';

const CATEGORIES = ['Vestidos', 'Blusas', 'Camisas', 'Calças', 'Saias', 'Casacos', 'Jaquetas', 'Bermudas', 'Pulseira', 'Brinco', 'Colar'];

export const StockList: React.FC = () => {
  const navigate = useNavigate();
  const { stockEntries: entries, products, suppliers, users: profiles, sales, refreshData, isLoading: dataLoading } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);
  
  // Estados para mapeamento de IDs para Nomes/Números Reais
  const [salesMapping, setSalesMapping] = useState<Record<string, number>>({});

  // States for Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [filterType, setFilterType] = useState(''); // '' | 'entrada' | 'saida'

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Cria mapa de vendas a partir dos dados do contexto
  useEffect(() => {
    const mapping: Record<string, number> = {};
    sales.forEach(s => {
      if (s.ui_id) mapping[s.id] = s.ui_id;
    });
    setSalesMapping(mapping);
  }, [sales]);

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
  }, [searchTerm, selectedBrand, selectedCategory, selectedSize, filterType, itemsPerPage]);

  const getProductInfo = (entry: StockEntry) => {
    if (!entry.produto_id) return null;
    
    for (const p of products) {
        const variant = p.variants?.find(v => v.id === entry.produto_id);
        if (variant) {
            // Retorna um objeto híbrido para compatibilidade com as colunas de filtro atuais
            return {
                ...p,
                ui_id: variant.ui_id,
                tamanho: variant.tamanho,
                cor: variant.cor,
                quantidade_estoque: variant.quantidade_estoque,
                preco_venda: variant.preco_venda,
                preco_custo: variant.preco_custo,
                variant_id: variant.id,
                sku: variant.sku,
                ean: variant.ean
            } as any;
        }
    }
    return null;
  };

  const filteredEntries = useMemo(() => {
    const searchLower = searchTerm.toLowerCase().trim();

    return entries
      .filter(entry => {
        const productInfo = getProductInfo(entry);
        const visualId = productInfo ? formatProductId(productInfo) : '';
        
        const brand = productInfo ? productInfo.marca : '';
        const category = productInfo ? productInfo.categoria : '';
        const size = productInfo ? productInfo.tamanho : '';
        const name = productInfo ? productInfo.nome : entry.produto_nome;
        
        const clientName = entry.cliente_nome || '';
        const reason = entry.motivo || '';

        const matchesSearch = 
            name.toLowerCase().includes(searchLower) || 
            visualId.toLowerCase().includes(searchLower) ||
            clientName.toLowerCase().includes(searchLower) ||
            reason.toLowerCase().includes(searchLower);
        
        const matchesBrand = selectedBrand ? brand === selectedBrand : true;
        const matchesCategory = selectedCategory ? category === selectedCategory : true;
        const matchesSize = selectedSize ? size === selectedSize : true;
        
        const matchesType = filterType 
            ? (filterType === 'entrada' ? entry.quantidade > 0 : entry.quantidade < 0)
            : true;

        return matchesSearch && matchesBrand && matchesCategory && matchesSize && matchesType;
      })
      .sort((a, b) => new Date(b.data_entrada).getTime() - new Date(a.data_entrada).getTime());
  }, [entries, products, searchTerm, selectedBrand, selectedCategory, selectedSize, filterType]);

  const totalItems = filteredEntries.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEntries = filteredEntries.slice(startIndex, endIndex);

  const handleRowClick = (entry: StockEntry) => {
    const product = getProductInfo(entry);
    if (product) {
        setProductToAdjust(product);
        setIsModalOpen(true);
    }
  };

  const handleOpenGeneralModal = () => {
    setProductToAdjust(null);
    setIsModalOpen(true);
  };

  const formatResponsibleAndReason = (entry: StockEntry) => {
    // 1. RESOLUÇÃO DO USUÁRIO (UUID -> NOME)
    const userId = entry.responsavel;
    const profile = profiles.find(p => p.id === userId);
    const displayUser = profile?.name || (userId?.length > 30 ? 'Usuário' : userId) || 'Sistema';

    const rawMotivo = entry.motivo || '';

    // 2. RESOLUÇÃO DA VENDA (UUID -> UI_ID)
    const resolveVendaId = (text: string) => {
        const idMatch = text.match(/#([\w-]+)/);
        if (!idMatch) return '?';
        const extractedId = idMatch[1];
        
        // Se for um UUID (com hífens) e estiver no mapa, troca pelo número
        if (extractedId.includes('-') && salesMapping[extractedId]) {
            return salesMapping[extractedId];
        }
        // Se não for UUID (já for número), ou não achar no mapa, retorna o que extraiu
        return extractedId;
    };

    // Devolução de Venda
    if (rawMotivo.includes('Devolução de Venda')) {
      const saleId = resolveVendaId(rawMotivo);
      return {
        top: `${displayUser} - Venda: ${saleId}`,
        bottom: '(Entrada - Devolução de Venda)',
        isProvador: false,
        isReturn: true,
        isReturned: false
      };
    }

    // Cadastro
    if (rawMotivo.includes('Cadastro de Produto')) {
      return {
        top: `${displayUser} - Cadastro`,
        bottom: '(Entrada - Cadastro de Produto)',
        isProvador: false,
        isReturn: false,
        isReturned: false
      };
    }

    // Alteração
    if (rawMotivo.includes('Atualização de Produto')) {
      return {
        top: `${displayUser} - Alteração`,
        bottom: '(Entrada - Atualização de Produto)',
        isProvador: false,
        isReturn: false,
        isReturned: false
      };
    }

    // Cancelamento Venda
    if (rawMotivo.includes('Cancelamento de Venda')) {
      const saleId = resolveVendaId(rawMotivo);
      return {
        top: `${displayUser} - Venda: ${saleId}`,
        bottom: '(Entrada - Cancelamento de Venda)',
        isProvador: false,
        isReturn: false,
        isReturned: false
      };
    }

    // Saída Venda
    if (rawMotivo.includes('Saída - Venda')) {
      const saleId = resolveVendaId(rawMotivo);
      return {
        top: `${displayUser} - Venda: ${saleId}`,
        bottom: '(Saída - Venda)',
        isProvador: false,
        isReturn: false,
        isReturned: false
      };
    }

    // Retorno Provador
    if (rawMotivo.includes('Retorno Provador')) {
       return {
          top: `${displayUser} - Devolução Provador`,
          bottom: entry.cliente_nome ? `(Cliente: ${entry.cliente_nome})` : `(Cliente não informado)`,
          isProvador: true,
          isReturn: false,
          isReturned: false
       };
    }

    // Baixa Manual / Saída Provador
    if (rawMotivo.includes('Saída Manual') || rawMotivo.includes('Provador')) {
      const isReturned = rawMotivo.includes('(Devolvido)');
      let specific = rawMotivo.replace('Saída Manual - ', '').replace(' (Devolvido)', '');
      
      if (entry.cliente_nome || specific.includes('Provador')) {
         return {
            top: `${displayUser} - ${specific.replace('Saída Manual - ', '')}`, 
            bottom: entry.cliente_nome ? `(Cliente: ${entry.cliente_nome})` : `(Responsável: ${displayUser})`,
            isProvador: true,
            isReturn: false,
            isReturned: isReturned
         };
      }

      return {
        top: `${displayUser} - Baixa`,
        bottom: `(${specific})`,
        isProvador: false,
        isReturn: false,
        isReturned: false
      };
    }

    return {
      top: displayUser,
      bottom: `(${rawMotivo})`,
      isProvador: false,
      isReturn: false,
      isReturned: false
    };
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Movimentação de Estoque</h2>
           <p className="text-zinc-500 dark:text-zinc-400">Histórico de entradas e saídas</p>
        </div>
        <Button onClick={handleOpenGeneralModal} className="flex items-center gap-2">
            <Archive size={18} /> Baixa de estoque
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
           <div className="flex flex-col md:flex-row gap-3 w-full flex-wrap">
             <div className="relative w-full md:w-60">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Produto, Cliente ou Motivo..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={filterType}
                     onChange={(e) => setFilterType(e.target.value)}
                   >
                     <option value="">Todos Tipos</option>
                     <option value="entrada">Entrada (+)</option>
                     <option value="saida">Saída (-)</option>
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>

                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={selectedBrand}
                     onChange={(e) => setSelectedBrand(e.target.value)}
                   >
                     <option value="">Marca</option>
                     {brands.map(b => <option key={b} value={b}>{b}</option>)}
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>

                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={selectedCategory}
                     onChange={(e) => setSelectedCategory(e.target.value)}
                   >
                     <option value="">Categoria</option>
                     {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>

                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={selectedSize}
                     onChange={(e) => setSelectedSize(e.target.value)}
                   >
                     <option value="">Tamanho</option>
                     {SIZES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>
              </div>
           </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {dataLoading ? (
            <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-3">
               <Loader2 className="animate-spin" size={32} />
               <p>Sincronizando nomes e dados de vendas...</p>
            </div>
          ) : (
            <>
              {/* MOBILE VIEW: Card List */}
              <div className="flex flex-col gap-3 sm:hidden p-4 bg-zinc-50 dark:bg-zinc-950/50">
                {currentEntries.map((entry) => {
                  const isPositive = entry.quantidade > 0;
                  const { weekDay, dateTime } = formatDateStandard(entry.data_entrada);
                  const product = getProductInfo(entry);
                  const visualId = formatProductId(product);
                  const { top, bottom, isProvador, isReturn, isReturned } = formatResponsibleAndReason(entry);

                  return (
                    <div 
                      key={entry.id} 
                      onClick={() => handleRowClick(entry)}
                      className={`text-left p-4 rounded-xl border bg-white dark:bg-zinc-900 shadow-sm active:scale-[0.98] transition-all flex flex-col gap-3 cursor-pointer ${
                        isReturn ? 'border-green-100 dark:border-green-900/30' :
                        isProvador && !isReturn && !isReturned ? 'border-purple-100 dark:border-purple-900/30' :
                        'border-zinc-100 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col min-w-0 flex-1 pr-2">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">{visualId}</span>
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mt-1 truncate">
                            {product?.nome || entry.produto_nome}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-medium text-zinc-500 uppercase">{product?.marca || '-'}</span>
                            <span className="text-zinc-300">•</span>
                            <Badge variant="outline" className="text-[9px] h-4 px-1">{product?.tamanho || '-'}</Badge>
                          </div>
                        </div>
                        <Badge variant={isPositive ? "success" : "destructive"} className="text-[10px] shrink-0 font-black">
                          {isPositive ? '+' : ''}{entry.quantidade} un
                        </Badge>
                      </div>

                      <div className="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
                        <div className={`mt-0.5 p-1.5 rounded-full ${
                          isReturn ? 'bg-green-100 text-green-600' :
                          isProvador ? 'bg-purple-100 text-purple-600' :
                          'bg-zinc-200 text-zinc-500'
                        }`}>
                          {isReturn ? <Undo2 size={14} /> : isProvador ? <Shirt size={14} /> : <User size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate ${
                             isReturn ? 'text-green-700 dark:text-green-400' :
                             isProvador ? 'text-purple-700 dark:text-purple-400' :
                             'text-zinc-800 dark:text-zinc-200'
                          }`}>{top}</p>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {/* Link direto funcional no Mobile com stopPropagation */}
                            {isProvador && entry.cliente_id && bottom.includes('Cliente') ? (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/clients/${entry.cliente_id}/history`);
                                }}
                                className="underline decoration-dotted hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                {bottom}
                              </span>
                            ) : (
                              bottom
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-2 border-t border-zinc-50 dark:border-zinc-800">
                        <div className="flex flex-col gap-1 text-[10px] text-zinc-400">
                          <div className="flex items-center gap-1">
                            <Calendar size={10} className="shrink-0" />
                            <span className="truncate">{weekDay.split('-')[0]}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={10} className="shrink-0" />
                            <span>{dateTime.split(' às ')[1]}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                           <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Estoque Final</span>
                           <div className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-black text-zinc-800 dark:text-zinc-200 font-mono">
                             {product ? product.quantidade_estoque : '-'}
                           </div>
                           <ChevronRight size={14} className="text-zinc-300 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {currentEntries.length === 0 && (
                   <div className="py-12 text-center text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                      Nenhuma movimentação encontrada.
                   </div>
                )}
              </div>

              {/* DESKTOP VIEW: Standard Table */}
              <table className="hidden sm:table w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Data / Hora</th>
                    <th className="px-6 py-4 font-medium">ID Produto</th>
                    <th className="px-6 py-4 font-medium">Produto</th>
                    <th className="px-6 py-4 font-medium text-center">Tam.</th>
                    <th className="px-6 py-4 font-medium text-center">Cor</th>
                    <th className="px-6 py-4 font-medium text-center">Quantidade Atual</th>
                    <th className="px-6 py-4 font-medium text-center">Quantidade Movimentada</th>
                    <th className="px-6 py-4 font-medium">Responsável / Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {currentEntries.map((entry) => {
                    const isPositive = entry.quantidade > 0;
                    const { weekDay, dateTime } = formatDateStandard(entry.data_entrada);
                    const product = getProductInfo(entry);
                    const { top, bottom, isProvador, isReturn, isReturned } = formatResponsibleAndReason(entry);
                    
                    return (
                      <tr 
                        key={entry.id} 
                        onClick={() => handleRowClick(entry)}
                        className={`
                          hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer 
                          ${isProvador && !isReturn && !isReturned ? 'bg-purple-50/30 dark:bg-purple-900/10' : ''}
                          ${isReturn ? 'bg-green-50/30 dark:bg-green-900/10' : ''}
                        `}
                        title="Clique para lançar baixa deste produto"
                      >
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                           <div className="flex flex-col text-xs">
                              <span className="font-bold text-zinc-800 dark:text-zinc-200">{weekDay}</span>
                              <span className="text-zinc-500 dark:text-zinc-500">{dateTime}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-900 dark:text-zinc-100 font-bold font-mono text-xs whitespace-nowrap">
                            {formatProductId(product)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-zinc-900 dark:text-white text-sm truncate max-w-[200px]">{product?.nome || entry.produto_nome}</span>
                            <div className="flex gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                <span>{product?.marca || '-'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           {product ? <Badge variant="outline">{product.tamanho}</Badge> : '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
                           {product?.cor || '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-zinc-700 dark:text-zinc-300 font-mono">
                           <div className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                             <Package size={12} className="text-zinc-400" />
                             {product ? product.quantidade_estoque : '-'}
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={isPositive ? "success" : "destructive"} className="gap-1 px-3">
                            {isPositive ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                            {isPositive ? '+' : ''}{entry.quantidade}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                             <div className="flex items-center gap-1.5">
                                {isProvador && !isReturn && <Shirt size={14} className="text-purple-600 dark:text-purple-400" />}
                                {isReturn && <Undo2 size={14} className="text-green-600 dark:text-green-400" />}
                                <span className={`text-sm font-medium whitespace-nowrap ${
                                    isReturn ? 'text-green-700 dark:text-green-300' :
                                    isProvador ? 'text-purple-700 dark:text-purple-300' : 
                                    'text-zinc-900 dark:text-white'
                                }`}>
                                    {top}
                                </span>
                             </div>
                             <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                {isProvador && bottom.includes('Cliente') && <User size={10} />}
                                {isProvador && entry.cliente_id && bottom.includes('Cliente') ? (
                                    <span 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/clients/${entry.cliente_id}/history`);
                                        }}
                                        className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                                    >
                                        {bottom}
                                    </span>
                                ) : (
                                    bottom
                                )}
                             </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

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

      <StockAdjustmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refreshData} 
        initialProduct={productToAdjust} 
      />
    </div>
  );
};