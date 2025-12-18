import React, { useState, useEffect, useMemo, useRef } from 'react';
/* Added RefreshCw to imports */
import { X, Search, Package, Save, AlertCircle, ChevronDown, ArrowDownCircle, Filter, Plus, Minus, User, Shirt, Trash2, Check, RefreshCw } from 'lucide-react';
import { Product, Client } from '../types';
import { mockService } from '../services/mockService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { SIZES_LIST } from '../constants';
import { useAuth } from '../contexts/AuthContext';

interface SelectedAdjustmentItem {
  product: Product;
  amount: string;
}

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products: Product[];
  initialProduct?: Product | null;
}

const CATEGORIES = ['Vestidos', 'Blusas', 'Camisas', 'Calças', 'Saias', 'Casacos', 'Jaquetas', 'Bermudas', 'Pulseira', 'Brinco', 'Colar'];
const REASON_OPTIONS = ['Provador', 'Defeito / Avaria', 'Doação', 'Perda / Roubo', 'Uso Interno', 'Outro'];

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ isOpen, onClose, onSuccess, products, initialProduct }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Lista de itens selecionados para baixa em massa
  const [selectedItems, setSelectedItems] = useState<SelectedAdjustmentItem[]>([]);
  
  // Filters State
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  // States for Reason logic
  const [reasonOption, setReasonOption] = useState(REASON_OPTIONS[0]);
  const [customReason, setCustomReason] = useState('');
  
  // Client Selection Logic (For Provador)
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const clientInputRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchBrands = async () => {
        try {
          const suppliers = await mockService.getSuppliers();
          const supplierBrands = suppliers
            .map(s => s.fantasy_name)
            .filter((name): name is string => !!name && name.trim() !== '');
          const uniqueBrands = Array.from(new Set(supplierBrands)).sort();
          setBrands(uniqueBrands);
        } catch (error) {
          console.error("Erro ao carregar marcas", error);
        }
      };
      fetchBrands();
      mockService.getClients().then(setClients);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (clientInputRef.current && !clientInputRef.current.contains(event.target as Node)) {
            setShowClientSuggestions(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialProduct && initialProduct.quantidade_estoque > 0) {
        setSelectedItems([{ product: initialProduct, amount: '1' }]);
      } else {
        setSelectedItems([]);
      }
      setSearchTerm('');
      setReasonOption(REASON_OPTIONS[0]);
      setCustomReason('');
      setIsLoading(false);
      setSelectedBrand('');
      setSelectedCategory('');
      setSelectedSize('');
      setClientSearch('');
      setSelectedClient(null);
      setShowClientSuggestions(false);
    }
  }, [isOpen, initialProduct]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm && !selectedBrand && !selectedCategory && !selectedSize) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return products.filter(p => {
      // Regra: Apenas produtos com estoque disponível podem ser selecionados para baixa
      const hasStock = p.quantidade_estoque > 0;
      if (!hasStock) return false;

      const matchesSearch = !searchTerm || (
        p.nome.toLowerCase().includes(lowerTerm) || 
        p.id_decoty.toLowerCase().includes(lowerTerm) ||
        p.sku.toLowerCase().includes(lowerTerm)
      );
      const matchesBrand = !selectedBrand || p.marca === selectedBrand;
      const matchesCategory = !selectedCategory || p.categoria === selectedCategory;
      const matchesSize = !selectedSize || p.tamanho === selectedSize;
      return matchesSearch && matchesBrand && matchesCategory && matchesSize;
    }).slice(0, 15); 
  }, [products, searchTerm, selectedBrand, selectedCategory, selectedSize]);

  const filteredClients = useMemo(() => {
      if (!clientSearch) return [];
      const lower = clientSearch.toLowerCase();
      return clients.filter(c => c.nome.toLowerCase().includes(lower) || (c.cpf && c.cpf.includes(lower))).slice(0, 5);
  }, [clients, clientSearch]);

  const addProductToList = (product: Product) => {
    if (selectedItems.some(item => item.product.id === product.id)) {
        alert("Este produto já está na lista.");
        return;
    }
    setSelectedItems(prev => [...prev, { product, amount: '1' }]);
    setSearchTerm('');
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

  // Validations
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
      alert("Corrija as quantidades antes de continuar. A quantidade deve ser maior que zero e não pode exceder o estoque disponível.");
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
    const userName = user?.user_metadata?.name || 'Usuário';

    setIsLoading(true);
    try {
        // Processa todos os itens em lote
        await Promise.all(selectedItems.map(item => {
            const currentStock = item.product.quantidade_estoque;
            const reduction = parseInt(item.amount) || 0;
            const finalStock = currentStock - reduction;
            return (mockService as any).updateProductStock(
                item.product.id, 
                finalStock, 
                finalReasonFormatted, 
                clientInfoPayload, 
                userName
            );
        }));

        setIsLoading(false);
        onSuccess();
        onClose();
    } catch (error: any) {
      console.error(error);
      alert("Erro ao processar as baixas de estoque.");
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-[98%] max-w-7xl h-[92vh] overflow-hidden animate-fade-in-up border border-zinc-200 dark:border-zinc-800 flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg text-red-700 dark:text-red-300">
              <ArrowDownCircle size={24} />
            </div>
            <div>
               <h2 className="text-xl font-bold text-zinc-800 dark:text-white">Baixa de Estoque em Massa</h2>
               <p className="text-sm text-zinc-500 dark:text-zinc-400">Selecione múltiplos produtos com estoque disponível</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400">
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white dark:bg-zinc-900">
          
          {/* Left Panel: Search and Selection */}
          <div className="w-full lg:w-1/3 border-r border-zinc-100 dark:border-zinc-800 p-6 flex flex-col gap-6 overflow-y-auto">
            <div className="space-y-4">
              <label className="text-base font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Search size={18} /> 1. Adicionar Produtos
              </label>
              
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Nome, ID ou SKU..."
                    className="w-full pl-10 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl focus:ring-2 focus:ring-zinc-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                   <select 
                     className="w-full py-2 px-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none"
                     value={selectedBrand}
                     onChange={(e) => setSelectedBrand(e.target.value)}
                   >
                     <option value="">Todas as Marcas</option>
                     {brands.map(b => <option key={b} value={b}>{b}</option>)}
                   </select>
                   <select 
                     className="w-full py-2 px-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none"
                     value={selectedCategory}
                     onChange={(e) => setSelectedCategory(e.target.value)}
                   >
                     <option value="">Todas as Categorias</option>
                     {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
              </div>

              {/* Search Results */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-lg flex items-center justify-between transition-colors group"
                    onClick={() => addProductToList(product)}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{product.nome}</p>
                      <p className="text-[10px] text-zinc-500">{product.id_decoty} • {product.tamanho} • {product.cor}</p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <span className="text-[9px] text-zinc-400 uppercase">Estoque</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {product.quantidade_estoque} un
                      </Badge>
                    </div>
                  </button>
                ))}
                {(searchTerm || selectedBrand || selectedCategory) && filteredProducts.length === 0 && (
                   <div className="p-8 text-center flex flex-col items-center gap-2">
                      <Package size={32} className="text-zinc-300" />
                      <p className="text-xs text-zinc-500">Nenhum produto com estoque encontrado para os filtros selecionados.</p>
                   </div>
                )}
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800" />

            {/* Reason and Client (Global) */}
            <div className="space-y-4">
              <label className="text-base font-bold text-zinc-700 dark:text-zinc-300">2. Motivo e Destino</label>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Motivo Geral</label>
                  <select 
                    className="w-full py-3 px-4 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-500"
                    value={reasonOption}
                    onChange={(e) => setReasonOption(e.target.value)}
                  >
                    {REASON_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                {reasonOption === 'Outro' && (
                   <input 
                    type="text"
                    className="w-full py-2 px-4 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Especifique o motivo..."
                  />
                )}

                {isProvador && (
                  <div className="space-y-2 animate-fade-in" ref={clientInputRef}>
                    <label className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1">
                        <Shirt size={12} /> Cliente do Provador
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                            type="text"
                            placeholder="Buscar por Nome ou CPF..."
                            className={`w-full pl-9 pr-8 py-3 border rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none transition-all ${
                                selectedClient ? 'border-purple-500 ring-1 ring-purple-500' : 'border-zinc-300 dark:border-zinc-700'
                            }`}
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
                            <button onClick={() => { setSelectedClient(null); setClientSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500">
                                <X size={16} />
                            </button>
                        )}
                        
                        {showClientSuggestions && !selectedClient && clientSearch.trim() && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                {filteredClients.length > 0 ? (
                                    filteredClients.map(c => (
                                        <button
                                            key={c.id}
                                            className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 last:border-0 flex items-center justify-between"
                                            onClick={() => { setSelectedClient(c); setShowClientSuggestions(false); }}
                                        >
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{c.nome}</p>
                                                <p className="text-[10px] text-zinc-500">{c.cpf || 'Sem CPF'}</p>
                                            </div>
                                            <Badge variant={c.pode_provador ? "success" : "destructive"} className="text-[9px] h-4">
                                                {c.pode_provador ? 'Autorizado' : 'Bloqueado'}
                                            </Badge>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-xs text-zinc-500">Nenhum cliente encontrado.</div>
                                )}
                            </div>
                        )}
                    </div>
                    {selectedClient && !selectedClient.pode_provador && (
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-[10px] text-red-700 dark:text-red-300 flex items-center gap-1.5 animate-pulse">
                            <AlertCircle size={14} /> Cliente sem permissão para provador.
                        </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Selected Items List */}
          <div className="flex-1 p-6 flex flex-col min-h-0 bg-zinc-50/50 dark:bg-black/10">
            <div className="flex justify-between items-center mb-6">
                <label className="text-lg font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                    <Package size={22} /> 3. Itens na Lista ({selectedItems.length})
                </label>
                {selectedItems.length > 0 && (
                    <button 
                        onClick={() => setSelectedItems([])} 
                        className="text-xs font-medium text-zinc-400 hover:text-red-500 transition-colors"
                    >
                        Limpar tudo
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {selectedItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-40">
                        <Package size={64} strokeWidth={1} className="mb-4" />
                        <p className="text-center font-medium">Nenhum produto selecionado.<br/>Use a busca à esquerda para adicionar.</p>
                    </div>
                ) : (
                    selectedItems.map((item, index) => {
                        const amount = parseInt(item.amount) || 0;
                        const isExceeding = amount > item.product.quantidade_estoque;
                        const isInvalid = amount <= 0;

                        return (
                            <div 
                                key={item.product.id} 
                                className={`bg-white dark:bg-zinc-800 p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-center gap-6 group animate-fade-in-up ${
                                    isExceeding ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-200 dark:border-zinc-700'
                                }`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Product Info */}
                                <div className="flex-1 min-w-0 w-full">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-zinc-900 dark:text-white truncate">{item.product.nome}</h4>
                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">{item.product.tamanho}</Badge>
                                    </div>
                                    <div className="flex wrap items-center gap-3 text-[11px] text-zinc-500">
                                        <span className="bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded font-mono">{item.product.id_decoty}</span>
                                        <span>{item.product.marca}</span>
                                        <span>{item.product.cor}</span>
                                        <span className={`font-bold ${item.product.quantidade_estoque <= 2 ? 'text-amber-600' : 'text-zinc-400'}`}>
                                            Disponível: {item.product.quantidade_estoque} un
                                        </span>
                                    </div>
                                </div>

                                {/* Multiplier / Qty Control */}
                                <div className="flex items-center gap-4 shrink-0 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-xl border border-zinc-100 dark:border-zinc-700">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => adjustItemAmount(item.product.id, -1)}
                                            className="h-8 w-8 flex items-center justify-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                className={`w-16 h-10 text-center font-bold text-base bg-white dark:bg-zinc-800 border rounded-lg outline-none focus:ring-2 focus:ring-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                                    isExceeding || isInvalid ? 'border-red-500 text-red-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white'
                                                }`}
                                                value={item.amount}
                                                onChange={(e) => updateItemAmount(item.product.id, e.target.value)}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => adjustItemAmount(item.product.id, 1)}
                                            className="h-8 w-8 flex items-center justify-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 transition-all"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block"></div>
                                    <div className="text-center min-w-[70px]">
                                        <p className="text-[9px] text-zinc-400 uppercase font-bold">Saldo Final</p>
                                        <p className={`text-sm font-black ${isExceeding ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-300'}`}>
                                            {item.product.quantidade_estoque - (parseInt(item.amount) || 0)}
                                        </p>
                                    </div>
                                </div>

                                {/* Item Actions */}
                                <button 
                                    onClick={() => removeProductFromList(item.product.id)}
                                    className="p-2 text-zinc-300 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                                    title="Remover da lista"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-3">
             {hasInvalidAmounts && (
                 <p className="text-xs font-bold text-red-500 flex items-center gap-1.5 animate-bounce">
                     <AlertCircle size={14} /> Verifique os erros nas quantidades acima
                 </p>
             )}
             {!hasInvalidAmounts && selectedItems.length > 0 && (
                 <p className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                     <Check size={14} className="text-green-500" /> Tudo pronto para processar {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'itens'}.
                 </p>
             )}
          </div>

          <div className="flex gap-4">
            <Button variant="ghost" onClick={onClose} disabled={isLoading} size="lg">
                Cancelar
            </Button>
            <Button 
                onClick={handleSave} 
                disabled={selectedItems.length === 0 || hasInvalidAmounts || isLoading || isClientInvalid || isClientNotAllowed}
                className={`min-w-[180px] h-14 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                    hasInvalidAmounts || selectedItems.length === 0
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                }`}
                size="lg"
            >
                {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <><Save size={20} /> Confirmar Baixa em Massa</>}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};