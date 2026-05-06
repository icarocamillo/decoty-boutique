
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  X, Search, Package, Save, AlertCircle, ChevronDown, 
  ArrowDownCircle, Filter, Plus, Minus, User, Shirt, 
  Trash2, Check, RefreshCw, List, ArrowLeft, Archive 
} from 'lucide-react';
import { Product, Client, ProductVariant } from '@/types';
import { backendService } from '@/services/backendService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SIZES_LIST } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { formatProductId } from '@/utils';

interface SelectedAdjustmentItem {
  product: any; // Using any for the hybrid object
  amount: string;
}

const CATEGORIES = ['Vestidos', 'Blusas', 'Camisas', 'Calças', 'Saias', 'Casacos', 'Jaquetas', 'Bermudas', 'Pulseira', 'Brinco', 'Colar'];
const REASON_OPTIONS = ['Provador', 'Defeito / Avaria', 'Doação', 'Perda / Roubo', 'Uso Interno', 'Outro'];

export const StockAdjustmentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, clients, suppliers, refreshData } = useData();

  // Get variantId from navigation state if available
  const variantId = (location.state as any)?.variantId;
  
  const [activeTab, setActiveTab] = useState<'search' | 'list'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedAdjustmentItem[]>([]);
  
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  const [reasonOption, setReasonOption] = useState(REASON_OPTIONS[0]);
  const [customReason, setCustomReason] = useState('');
  
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const clientInputRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Brands logic
  const brands = useMemo(() => {
    const supplierBrands = suppliers
      .map(s => s.fantasy_name)
      .filter((name): name is string => !!name && name.trim() !== '');
    return Array.from(new Set(supplierBrands)).sort();
  }, [suppliers]);

  // Handle initial product from URL
  useEffect(() => {
    if (variantId && products.length > 0) {
      let foundVariant: any = null;
      
      // Search by ui_id or UUID
      for (const p of products) {
        const v = p.variants?.find(v => v.ui_id.toString() === variantId || v.id === variantId);
        if (v) {
          foundVariant = {
            ...v,
            parent_id: p.id,
            parent_nome: p.nome,
            parent_marca: p.marca,
            parent_visual_id: formatProductId(p),
            variant_visual_id: formatProductId({ ui_id: v.ui_id })
          };
          break;
        }
      }

      if (foundVariant && foundVariant.quantidade_estoque > 0) {
        const hybridProduct = {
          id: foundVariant.id,
          nome: foundVariant.parent_nome,
          marca: foundVariant.parent_marca,
          tamanho: foundVariant.tamanho,
          cor: foundVariant.cor,
          ui_id: foundVariant.ui_id,
          quantidade_estoque: foundVariant.quantidade_estoque
        };
        
        // Only add if not already there
        setSelectedItems(prev => {
          if (prev.some(item => item.product.id === hybridProduct.id)) return prev;
          return [...prev, { product: hybridProduct, amount: '1' }];
        });
        setActiveTab('list');
      }
    }
  }, [variantId, products]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (clientInputRef.current && !clientInputRef.current.contains(event.target as Node)) {
            setShowClientSuggestions(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredVariants = useMemo(() => {
    if (!searchTerm && !selectedBrand && !selectedCategory && !selectedSize) return [];
    const lowerTerm = searchTerm.toLowerCase();
    
    const results: any[] = [];
    products.forEach(p => {
       const vid = formatProductId(p).toLowerCase();
       const matchesParent = 
          (p.nome.toLowerCase().includes(lowerTerm) || vid.includes(lowerTerm)) &&
          (!selectedBrand || p.marca === selectedBrand) &&
          (!selectedCategory || p.categoria === selectedCategory);
       
       p.variants?.forEach(v => {
           const matchVariant = 
              v.sku.toLowerCase().includes(lowerTerm) || 
              v.cor.toLowerCase().includes(lowerTerm);
           
           const matchesSize = !selectedSize || v.tamanho === selectedSize;

           if ((matchesParent || matchVariant) && matchesSize && v.quantidade_estoque > 0) {
               results.push({
                   ...v,
                   parent_id: p.id,
                   parent_nome: p.nome,
                   parent_marca: p.marca,
                   parent_visual_id: vid,
                   variant_visual_id: formatProductId({ ui_id: v.ui_id })
               });
           }
       });
    });
    
    return results.slice(0, 15);
  }, [products, searchTerm, selectedBrand, selectedCategory, selectedSize]);

  const filteredClients = useMemo(() => {
      if (!clientSearch) return [];
      const lower = clientSearch.toLowerCase();
      return clients.filter(c => c.nome.toLowerCase().includes(lower) || (c.cpf && c.cpf.includes(lower))).slice(0, 5);
  }, [clients, clientSearch]);

  const addProductToList = (v: any) => {
    if (selectedItems.some(item => item.product.id === v.id)) {
        alert("Este produto já está na lista.");
        return;
    }
    const hybridProduct = {
        id: v.id,
        nome: v.parent_nome,
        marca: v.parent_marca,
        tamanho: v.tamanho,
        cor: v.cor,
        ui_id: v.ui_id,
        quantidade_estoque: v.quantidade_estoque
    };
    setSelectedItems(prev => [...prev, { product: hybridProduct, amount: '1' }]);
    setSearchTerm('');
    setActiveTab('list');
  };

  const removeProductFromList = (productId: string) => {
    setSelectedItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateItemAmount = (productId: string, newAmount: string) => {
    setSelectedItems(prev => prev.map(item => 
        item.product.id === productId ? { ...item, amount: newAmount } : item
    ));
  };

  const adjustItemAmount = (productId: string, delta: number) => {
    setSelectedItems(prev => prev.map(item => {
        if (item.product.id === productId) {
            const current = parseInt(item.amount) || 0;
            const next = Math.max(0, current + delta);
            return { ...item, amount: next.toString() };
        }
        return item;
    }));
  };

  const isProvador = reasonOption === 'Provador';
  const hasInvalidAmounts = selectedItems.some(item => {
      const amount = parseInt(item.amount) || 0;
      return amount <= 0 || amount > item.product.quantidade_estoque;
  });
  const isClientInvalid = isProvador && !selectedClient;
  const isClientNotAllowed = isProvador && selectedClient && !selectedClient.pode_provador;

  const handleSave = async () => {
    if (selectedItems.length === 0) return;
    if (hasInvalidAmounts) {
      alert("Corrija as quantidades antes de continuar.");
      return;
    }
    if (isProvador && (!selectedClient || !selectedClient.pode_provador)) {
        alert("Para saída de Provador, selecione um cliente autorizado.");
        return;
    }

    const specificReason = reasonOption === 'Outro' ? customReason : reasonOption;
    if (!specificReason.trim()) {
       alert("Informe o motivo da baixa.");
       return;
    }

    const finalReasonFormatted = `Saída Manual - ${specificReason}`;
    const clientInfoPayload = selectedClient ? { id: selectedClient.id, name: selectedClient.nome } : undefined;
    
    const userId = user?.id || '';

    setIsLoading(true);
    try {
        await Promise.all(selectedItems.map(item => {
            const currentStock = item.product.quantidade_estoque;
            const reduction = parseInt(item.amount) || 0;
            const finalStock = currentStock - reduction;
            return (backendService as any).updateProductStock(
                item.product.id, 
                finalStock, 
                finalReasonFormatted, 
                clientInfoPayload, 
                userId
            );
        }));

        setIsLoading(false);
        refreshData();
        navigate('/erp/stock');
    } catch (error: any) {
      alert("Erro ao processar as baixas de estoque.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/erp/stock')} className="p-2">
            <ArrowLeft size={24} />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm uppercase font-bold tracking-wider mb-1">
              <Package size={14} />
              <span>Gestão de Estoque</span>
              <ChevronDown size={14} className="-rotate-90" />
              <span>Baixa Manual</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-zinc-900 dark:text-white">
              Ajuste de Estoque
            </h1>
          </div>
        </div>
      </div>

      {/* MOBILE TABS */}
      <div className="flex lg:hidden bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <button 
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-4 transition-colors ${activeTab === 'search' ? 'border-red-600 text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20' : 'border-transparent text-zinc-500'}`}
          >
            <Search size={18} /> Produtos
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-4 transition-colors ${activeTab === 'list' ? 'border-red-600 text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20' : 'border-transparent text-zinc-500'}`}
          >
            <div className="relative">
                <List size={18} />
                {selectedItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-pulse shadow-lg ring-2 ring-white dark:ring-zinc-900">
                    {selectedItems.length}
                  </span>
                )}
            </div>
            Itens Selecionados
          </button>
      </div>

      {/* Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
        
        {/* SIDEBAR: SEARCH AND FILTERS */}
        <div className={`${activeTab === 'search' ? 'flex' : 'hidden'} lg:flex w-full lg:w-96 flex-col gap-6`}>
          <Card className="p-6 space-y-6 flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 shadow-md">
            <div className="space-y-4 flex flex-col flex-1 min-h-0">
              <label className="text-base font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <div className="bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-lg">
                  <Search size={18} className="text-zinc-600 dark:text-zinc-400" />
                </div>
                1. Buscar Itens
              </label>
              
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Nome, SKU ou ID..." 
                    className="w-full pl-10 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all placeholder:text-zinc-400" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                   <select className="w-full py-2.5 px-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}><option value="">Todas as Marcas</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}</select>
                   <select className="w-full py-2.5 px-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}><option value="">Todas as Categorias</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
              </div>
              
              {/* SEARCH RESULTS */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                {filteredVariants.map(v => (
                  <button 
                    key={v.id} 
                    className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl flex items-center justify-between transition-all group active:scale-[0.98] bg-white dark:bg-zinc-900 shadow-sm" 
                    onClick={() => addProductToList(v)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs uppercase text-zinc-400 tracking-tighter mb-0.5">{v.variant_visual_id || v.parent_visual_id}</p>
                      <p className="font-bold text-sm text-zinc-900 dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400">{v.parent_nome}</p>
                      <p className="text-[10px] text-zinc-500 font-medium">{v.tamanho} • {v.cor}</p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-3">
                      <span className="text-[10px] font-black text-zinc-400 uppercase mb-1">Estoque</span>
                      <Badge variant={v.quantidade_estoque <= 2 ? "destructive" : "secondary"} className="text-[11px] px-2 py-0.5">
                        {v.quantidade_estoque}
                      </Badge>
                    </div>
                  </button>
                ))}
                
                {searchTerm && filteredVariants.length === 0 && (
                   <div className="py-12 text-center">
                     <Package size={40} className="mx-auto mb-2 text-zinc-300 opacity-20" />
                     <p className="text-zinc-400 text-sm italic">Nenhum produto encontrado.</p>
                   </div>
                )}
                
                {!searchTerm && !selectedBrand && !selectedCategory && !selectedSize && (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-20 grayscale">
                        <Package size={64} className="mb-4 text-zinc-400" />
                        <p className="text-sm font-bold text-zinc-500 text-center uppercase tracking-widest px-4">Busque produtos para começar</p>
                    </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* MAIN AREA: LIST AND REASON */}
        <div className={`${activeTab === 'list' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col gap-6`}>
          
          {/* Motivo Seletor */}
          <Card className="p-6 bg-white dark:bg-zinc-900 shadow-md">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <label className="text-base font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <div className="bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400">
                    <Filter size={18} />
                  </div>
                  2. Motivo da Baixa
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Selecione o Motivo</label>
                    <div className="relative">
                      <select 
                        className="w-full py-3 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition-all appearance-none cursor-pointer" 
                        value={reasonOption} 
                        onChange={(e) => setReasonOption(e.target.value)}
                      >
                        {REASON_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
                    </div>
                  </div>

                  {isProvador ? (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2" ref={clientInputRef}>
                      <label className="text-[10px] font-black text-purple-600 uppercase tracking-wider flex items-center gap-1">
                        <Shirt size={12} /> Cliente do Provador
                      </label>
                      <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                          <input 
                            type="text" 
                            placeholder="Buscar por Nome ou CPF..." 
                            className={`w-full pl-9 pr-10 py-3 border rounded-xl bg-white dark:bg-zinc-800 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all ${selectedClient ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-zinc-200 dark:border-zinc-700'}`} 
                            value={selectedClient ? selectedClient.nome : clientSearch} 
                            onChange={(e) => { 
                              if (selectedClient) { 
                                setSelectedClient(null); 
                                setClientSearch(''); 
                              } else { 
                                setClientSearch(e.target.value); 
                                setShowClientSuggestions(true); 
                              } 
                            }} 
                            onFocus={() => !selectedClient && setShowClientSuggestions(true)} 
                            readOnly={!!selectedClient} 
                          />
                          {selectedClient && (
                            <button 
                              onClick={() => { setSelectedClient(null); setClientSearch(''); }} 
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-red-50 dark:bg-red-950/30 text-red-600 rounded-full hover:scale-110 transition-transform"
                            >
                              <X size={14} />
                            </button>
                          )}
                          
                          {showClientSuggestions && !selectedClient && clientSearch.trim() && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                                  <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase px-2">Sugestões de Clientes</p>
                                  </div>
                                  {filteredClients.length > 0 ? (filteredClients.map(c => (
                                          <button 
                                            key={c.id} 
                                            className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b last:border-0 border-zinc-100 dark:border-zinc-800 flex items-center justify-between group transition-colors" 
                                            onClick={() => { setSelectedClient(c); setShowClientSuggestions(false); }}
                                          >
                                              <div className="min-w-0">
                                                <p className="font-bold text-sm truncate text-zinc-900 dark:text-white group-hover:text-purple-600 transition-colors">{c.nome}</p>
                                                <p className="text-[10px] text-zinc-500">{c.cpf || 'Sem CPF'}</p>
                                              </div>
                                              <Badge variant={c.pode_provador ? "success" : "destructive"} className="text-[9px] h-4">
                                                {c.pode_provador ? 'Autorizado' : 'Bloqueado'}
                                              </Badge>
                                          </button>
                                      ))) : <div className="p-4 text-center text-xs text-zinc-500 italic">Nenhum cliente encontrado.</div>}
                              </div>
                          )}
                      </div>
                    </div>
                  ) : reasonOption === 'Outro' ? (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Especifique o Motivo</label>
                      <input 
                        type="text" 
                        value={customReason} 
                        onChange={(e) => setCustomReason(e.target.value)} 
                        placeholder="Ex: Ajuste de inventário anual" 
                        className="w-full py-3 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition-all" 
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          {/* ITENS LIST */}
          <Card className="flex-1 p-6 space-y-4 flex flex-col min-h-0 bg-white dark:bg-zinc-900 shadow-md">
            <div className="flex justify-between items-center shrink-0">
                <label className="text-lg font-black text-zinc-800 dark:text-white flex items-center gap-2">
                  <div className="bg-red-50 dark:bg-red-950/20 p-1.5 rounded-lg text-red-600">
                    <List size={20} />
                  </div>
                  3. Itens na Lista ({selectedItems.length})
                </label>
                {selectedItems.length > 0 && (
                  <button 
                    onClick={() => setSelectedItems([])} 
                    className="text-xs font-black text-zinc-400 hover:text-red-500 uppercase tracking-widest flex items-center gap-2 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={14} />
                    Limpar tudo
                  </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-0">
                {selectedItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 opacity-30 grayscale italic text-zinc-500">
                        <Archive size={80} strokeWidth={1} className="mb-4" />
                        <p className="text-center font-bold uppercase tracking-[0.2em]">Sua lista está vazia</p>
                        <p className="text-xs mt-2 font-normal">Adicione produtos através da busca lateral</p>
                    </div>
                ) : (
                    selectedItems.map((item) => {
                        const amount = parseInt(item.amount) || 0;
                        const isExceeding = amount > item.product.quantidade_estoque;
                        return (
                            <div key={item.product.id} className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-center gap-4 group animate-in slide-in-from-right-4 duration-300 ${isExceeding ? 'bg-red-50/50 dark:bg-red-950/10 border-red-500 ring-2 ring-red-500/10' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 shadow-sm'}`}>
                                <div className="flex-1 min-w-0 w-full">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-black text-base text-zinc-900 dark:text-white truncate">{item.product.nome}</h4>
                                        <Badge variant="outline" className="text-[10px] font-black h-5 px-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700">{item.product.tamanho}</Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] font-bold text-zinc-500 tracking-tight">
                                        <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400 font-mono ring-1 ring-zinc-200 dark:ring-zinc-700">
                                          {formatProductId(item.product)}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full ${item.product.quantidade_estoque <= 2 ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                          Estoque atual: {item.product.quantidade_estoque} un
                                        </span>
                                        <span className="hidden md:inline text-zinc-300">•</span>
                                        <span className="hidden md:inline font-medium text-zinc-400">{item.product.cor}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 w-full md:w-auto justify-between group-hover:bg-white dark:group-hover:bg-zinc-800 transition-colors">
                                    <div className="flex items-center gap-2.5">
                                        <button 
                                          onClick={() => adjustItemAmount(item.product.id, -1)} 
                                          className="h-10 w-10 flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm active:scale-90"
                                        >
                                          <Minus size={18} strokeWidth={3} />
                                        </button>
                                        <input 
                                          type="number" 
                                          className={`w-16 h-10 text-center font-black text-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-4 focus:ring-red-500/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${isExceeding ? 'text-red-600 bg-red-50 border-red-500 shadow-inner' : 'text-zinc-900 dark:text-white'}`} 
                                          value={item.amount} 
                                          onChange={(e) => updateItemAmount(item.product.id, e.target.value)} 
                                        />
                                        <button 
                                          onClick={() => adjustItemAmount(item.product.id, 1)} 
                                          className="h-10 w-10 flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm active:scale-90"
                                        >
                                          <Plus size={18} strokeWidth={3} />
                                        </button>
                                    </div>
                                    <div className="text-center min-w-[90px] border-l border-zinc-200 dark:border-zinc-800 ml-2 pl-4">
                                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5 leading-none">Saldo Final</p>
                                        <p className={`text-xl font-black tabular-nums transition-colors ${isExceeding ? 'text-red-500 animate-pulse' : 'text-zinc-900 dark:text-white'}`}>
                                          {item.product.quantidade_estoque - (parseInt(item.amount) || 0)}
                                        </p>
                                    </div>
                                </div>

                                <button 
                                  onClick={() => removeProductFromList(item.product.id)} 
                                  className="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all shrink-0 active:scale-90"
                                  title="Remover item"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ACTION BAR */}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-6 shrink-0">
                <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
                    {hasInvalidAmounts ? (
                         <div className="flex items-center gap-2 text-red-600 font-black text-sm bg-red-100 dark:bg-red-950/20 px-4 py-2 rounded-xl animate-bounce">
                           <AlertCircle size={20} />
                           <span>Quantidades Excedentes no Estoque</span>
                         </div>
                    ) : selectedItems.length > 0 ? (
                        <>
                            <span className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Resumo da Baixa de Estoque</span>
                            <div className="flex items-end gap-3 font-black">
                              <span className="text-4xl text-zinc-900 dark:text-white leading-none">
                                {selectedItems.reduce((acc, curr) => acc + (parseInt(curr.amount) || 0), 0)}
                              </span>
                              <span className="text-sm text-zinc-400 uppercase pb-1 tracking-widest">Unidades selecionadas</span>
                            </div>
                        </>
                    ) : (
                      <p className="text-sm font-bold text-zinc-400 italic">Lista aguardando produtos...</p>
                    )}
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                  <Button 
                    variant="ghost"
                    onClick={() => navigate('/erp/stock')}
                    className="flex-1 md:flex-none h-14 px-8 font-black uppercase tracking-widest text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    Descartar
                  </Button>
                  <Button 
                      onClick={handleSave} 
                      disabled={selectedItems.length === 0 || hasInvalidAmounts || isLoading || isClientInvalid || isClientNotAllowed} 
                      className="flex-[2] md:flex-none px-12 h-14 md:h-16 text-lg font-black uppercase tracking-[0.1em] shadow-2xl shadow-red-600/30 ring-4 ring-red-600/10 flex items-center justify-center gap-3 transition-all active:scale-95 bg-red-600 hover:bg-red-700 text-white border-0"
                  >
                      {isLoading ? (
                        <><RefreshCw className="animate-spin" size={24} /> Processando...</>
                      ) : (
                        <><Save size={24} /> Confirmar Ajuste</>
                      )}
                  </Button>
                </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
