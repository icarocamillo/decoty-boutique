import React, { useState, useEffect, useMemo } from 'react';
import { X, User, CreditCard, Tag, Package, Receipt, Link, AlertTriangle, Mail, ShieldCheck, PieChart, Activity, Phone, Smartphone, Search, Loader2, Check, Gift, Undo2 } from 'lucide-react';
import { Sale, Client, SaleItem } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { mockService } from '../services/mockService';
import { formatDateStandard } from '../utils';
import { useAuth } from '../contexts/AuthContext';

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSaleCancelled?: () => void; 
}

// --- SUB-COMPONENT: MODAL DE DEVOLUÇÃO ---
interface ReturnItemsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale;
    client: Client | null;
    onConfirm: (selectedItems: SaleItem[]) => void;
    isLoading: boolean;
}

const ReturnItemsModal: React.FC<ReturnItemsModalProps> = ({ isOpen, onClose, sale, client, onConfirm, isLoading }) => {
    const [selectedVirtualIds, setSelectedVirtualIds] = useState<Set<string>>(new Set());

    // Auxiliar para "desenrolar" itens com quantidade > 1 (suporte a dados legados ou agrupados)
    const unrolledItems = useMemo(() => {
        const list: (SaleItem & { virtualId: string })[] = [];
        sale.items?.forEach(item => {
            // Se for status returned, ele já conta como ocupado no Ledger visual
            for (let i = 0; i < item.quantidade; i++) {
                list.push({
                    ...item,
                    quantidade: 1,
                    subtotal: item.subtotal / item.quantidade,
                    desconto: (item.desconto || 0) / item.quantidade,
                    virtualId: `${item.id}-${i}`
                });
            }
        });
        return list;
    }, [sale.items]);

    // Filtra apenas itens que ainda NÃO foram devolvidos
    const availableItems = useMemo(() => 
        unrolledItems.filter(item => item.status !== 'returned') || [], 
    [unrolledItems]);

    const toggleItem = (virtualId: string) => {
        const next = new Set(selectedVirtualIds);
        if (next.has(virtualId)) next.delete(virtualId);
        else next.add(virtualId);
        setSelectedVirtualIds(next);
    };

    const selectedItems = availableItems.filter(i => selectedVirtualIds.has(i.virtualId));
    const totalToRefund = selectedItems.reduce((acc, curr) => acc + curr.subtotal, 0);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-zinc-200 dark:border-zinc-800 flex flex-col">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
                    <div className="flex items-center gap-2">
                        <Undo2 className="text-red-600" size={20} />
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Devolver Itens</h3>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {availableItems.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <Check size={32} className="text-green-600" />
                            </div>
                            <p className="font-bold text-zinc-900 dark:text-white">Todos os itens já foram devolvidos.</p>
                            <p className="text-sm text-zinc-500">Esta venda não possui mais itens pendentes de estorno.</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Selecione os itens que o cliente deseja devolver:</p>
                            
                            <div className="space-y-2">
                                {availableItems.map(item => (
                                    <label 
                                        key={item.virtualId} 
                                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                                            selectedVirtualIds.has(item.virtualId) 
                                            ? 'border-red-500 bg-red-50/30 dark:bg-red-900/10 ring-1 ring-red-500' 
                                            : 'border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedVirtualIds.has(item.virtualId)} 
                                                onChange={() => toggleItem(item.virtualId)}
                                                className="w-4 h-4 rounded border-zinc-300 text-red-600 focus:ring-red-500 bg-transparent"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{item.nome_produto}</p>
                                                <p className="text-xs text-zinc-500">{item.tamanho} • {formatCurrency(item.preco_unitario)}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{formatCurrency(item.subtotal)}</span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}

                    {!client && availableItems.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-3 rounded-lg flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                            <AlertTriangle size={16} className="shrink-0" />
                            <span><strong>Aviso:</strong> Como esta venda não está vinculada a um cliente cadastrado, o valor da devolução <strong>não poderá ser gerado como Vale Presente</strong> automático. Vincule um cliente primeiro.</span>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-sm font-medium text-zinc-500">Crédito a ser gerado:</span>
                        <span className="text-xl font-bold text-zinc-900 dark:text-white">{formatCurrency(totalToRefund)}</span>
                    </div>
                    <Button 
                        variant="destructive" 
                        className="w-full h-12 gap-2" 
                        disabled={selectedVirtualIds.size === 0 || isLoading || availableItems.length === 0}
                        onClick={() => onConfirm(selectedItems)}
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> Confirmar Devolução</>}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({ isOpen, onClose, sale, onSaleCancelled }) => {
  const { user: currentUser } = useAuth(); 
  const [isCancelling, setIsCancelling] = useState(false);
  const [clientDetails, setClientDetails] = useState<Client | null>(null);
  
  // States para vínculo de cliente
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [isLinkingLoading, setIsLinkingLoading] = useState(false);
  
  // Estado local da venda para refletir atualizações
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);

  // Novo: Controle do Modal de Devolução
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  useEffect(() => {
      setCurrentSale(sale);
      setIsLinkingMode(false);
      setLinkSearchTerm('');
  }, [sale, isOpen]);

  useEffect(() => {
    if (isOpen && currentSale?.cliente_id) {
        mockService.getClients().then(clients => {
            const found = clients.find(c => c.id === currentSale.cliente_id);
            setClientDetails(found || null);
        });
    } else {
        setClientDetails(null);
    }
  }, [isOpen, currentSale]);

  // Auxiliar para "desenrolar" itens para exibição individual na tabela
  const unrolledItems = useMemo(() => {
    if (!currentSale?.items) return [];
    const list: (SaleItem & { virtualId: string })[] = [];
    currentSale.items.forEach(item => {
        for (let i = 0; i < item.quantidade; i++) {
            list.push({
                ...item,
                quantidade: 1,
                subtotal: item.subtotal / item.quantidade,
                desconto: (item.desconto || 0) / item.quantidade,
                virtualId: `${item.id}-${i}`
            });
        }
    });
    return list;
  }, [currentSale?.items]);

  if (!isOpen || !currentSale) return null;

  const { weekDay, dateTime } = formatDateStandard(currentSale.data_venda);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getInstallmentText = () => {
    const parcelas = currentSale.parcelas || 1;
    const valorParcela = currentSale.valor_total > 0 ? currentSale.valor_total / parcelas : 0;
    return `${parcelas}x de ${formatCurrency(valorParcela)}`;
  };

  // Cálculos Financeiros Globais
  const totalGross = currentSale.items?.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0) || 0;
  
  // Soma apenas subtotais de itens com status 'sold'
  const soldItemsSubtotal = currentSale.items?.filter(i => i.status === 'sold').reduce((acc, i) => acc + i.subtotal, 0) || 0;
  
  // Total atual abatendo itens devolvidos
  const currentTotalPaid = currentSale.status === 'cancelled' ? 0 : Math.max(0, soldItemsSubtotal - (currentSale.desconto_extra || 0) - (currentSale.uso_vale_presente || 0));

  const totalPaymentDiscount = currentSale.items?.filter(i => i.status === 'sold').reduce((acc, item) => acc + (item.desconto || 0), 0) || 0;
  const totalExtraDiscount = currentSale.desconto_extra || 0;
  const giftCardUsed = currentSale.uso_vale_presente || 0;

  const taxas = currentSale.taxas_aplicadas;
  const valorLiquidoReal = currentSale.valor_liquido_lojista || (currentTotalPaid - (taxas?.valor || 0));

  const isUnregistered = currentSale.cliente_nome === 'Cliente não cadastrado' || !currentSale.cliente_id;
  
  const phoneToDisplay = clientDetails?.celular || clientDetails?.telefone_fixo || clientDetails?.telefone;
  const isWhatsApp = clientDetails?.is_whatsapp;

  // Lógica para extrair Nome e E-mail do Vendedor da Venda
  const sellerRaw = currentSale.vendedor || 'Usuário';
  const hasSeparator = sellerRaw.includes(' - ');
  const sellerName = hasSeparator ? sellerRaw.split(' - ')[0] : sellerRaw;
  const sellerEmail = hasSeparator ? sellerRaw.split(' - ')[1] : '';

  const displayId = currentSale.sales_id ? `#${currentSale.sales_id}` : currentSale.id.replace('s', '#');

  // --- LÓGICA DE VÍNCULO DE CLIENTE ---
  const handleStartLinking = async () => {
      setIsLinkingMode(true);
      if (clientsList.length === 0) {
          const loadedClients = await mockService.getClients();
          setClientsList(loadedClients);
      }
  };

  const filteredClientsToLink = clientsList.filter(c => {
      if (!linkSearchTerm) return false;
      const term = linkSearchTerm.toLowerCase();
      return c.nome.toLowerCase().includes(term) || (c.cpf && c.cpf.includes(term));
  }).slice(0, 5); 

  const handleSelectClientToLink = async (client: Client) => {
      if (!currentSale) return;
      setIsLinkingLoading(true);
      try {
          const success = await mockService.linkClientToSale(currentSale.id, client);
          if (success) {
              setCurrentSale(prev => prev ? ({
                  ...prev,
                  cliente_id: client.id,
                  cliente_nome: client.nome,
                  cliente_cpf: client.cpf
              }) : null);
              setClientDetails(client);
              setIsLinkingMode(false);
              if (onSaleCancelled) onSaleCancelled();
          } else {
              alert("Erro ao vincular cliente.");
          }
      } catch (error) {
          console.error(error);
          alert("Erro técnico ao vincular.");
      } finally {
          setIsLinkingLoading(false);
      }
  };

  // --- LÓGICA DE DEVOLUÇÃO ITEM A ITEM ---
  const handleConfirmReturn = async (selectedItems: SaleItem[]) => {
    setIsCancelling(true);
    const userName = currentUser?.user_metadata?.name || 'Usuário';
    const totalRefund = selectedItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    
    try {
        await mockService.returnSaleItems(currentSale.id, selectedItems, currentSale.cliente_id, totalRefund, userName);

        alert(`Devolução processada com sucesso! ${currentSale.cliente_id ? `R$ ${totalRefund.toFixed(2)} adicionados ao vale-presente do cliente.` : ''}`);
        
        if (onSaleCancelled) onSaleCancelled();
        onClose();
    } catch (error) {
        console.error(error);
        alert("Erro ao processar devolução.");
    } finally {
        setIsCancelling(false);
        setIsReturnModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-4xl overflow-hidden animate-fade-in-up border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg text-zinc-600 dark:text-zinc-300">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-800 dark:text-white flex items-baseline gap-2 flex-wrap">
                Detalhes da Venda {displayId}
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 font-normal">({currentSale.id})</span>
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {weekDay}, {dateTime}
                </p>
                <span className="text-zinc-300 dark:text-zinc-600">—</span>
                {currentSale.status === 'cancelled' ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 h-4">Cancelada</Badge>
                ) : (
                    <Badge variant="success" className="text-[10px] px-1.5 h-4">Concluída</Badge>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400">
            <X size={20} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0 bg-white dark:bg-zinc-900">
          
          {/* Top Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Informações do Cliente & Vendedor */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col h-full shadow-sm">
                <div className="bg-zinc-50 dark:bg-zinc-900/50 px-4 py-3 border-b border-zinc-100 dark:border-zinc-700 flex justify-between items-center">
                   <h3 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                     <User size={14} /> Cliente
                   </h3>
                </div>
                
                <div className="p-5 flex-1 space-y-4">
                   {!isLinkingMode ? (
                       <>
                           <div className="flex items-start gap-4">
                              <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0 border border-zinc-200 dark:border-zinc-600">
                                 <User size={24} />
                              </div>
                              <div className="min-w-0 flex-1">
                                 <p className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                                   {currentSale.cliente_nome || 'Cliente Balcão'}
                                 </p>
                                 <div className="flex flex-col gap-1.5 mt-2">
                                    {currentSale.cliente_cpf && (
                                        <p className="text-sm text-zinc-500 font-mono flex items-center gap-1.5">
                                        <CreditCard size={12} /> {currentSale.cliente_cpf}
                                        </p>
                                    )}
                                    {phoneToDisplay && (
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-zinc-500 font-medium flex items-center gap-1.5">
                                                <Phone size={12} /> {phoneToDisplay}
                                            </p>
                                            {isWhatsApp && (
                                                <Badge variant="success" className="text-[9px] px-1.5 py-0 h-4 gap-1">
                                                    <Smartphone size={8} /> Whats
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                           {isUnregistered && currentSale.status !== 'cancelled' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleStartLinking} 
                                className="w-full text-xs h-8 border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                              >
                                <Link size={12} className="mr-1.5" /> Vincular a um cadastro
                              </Button>
                           )}
                       </>
                   ) : (
                       <div className="animate-fade-in space-y-3">
                           <div className="flex items-center gap-2">
                               <div className="relative flex-1">
                                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                   <input 
                                       type="text" 
                                       placeholder="Buscar nome ou CPF..." 
                                       className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                       value={linkSearchTerm}
                                       onChange={(e) => setLinkSearchTerm(e.target.value)}
                                       autoFocus
                                   />
                               </div>
                               <Button variant="ghost" size="icon" onClick={() => setIsLinkingMode(false)} className="h-9 w-9 shrink-0">
                                   <X size={18} />
                               </Button>
                           </div>
                           <div className="max-h-40 overflow-y-auto border border-zinc-100 dark:border-zinc-700 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50">
                                {isLinkingLoading ? (
                                    <div className="p-4 text-center text-zinc-500 flex items-center justify-center gap-2 text-xs">
                                        <Loader2 className="animate-spin" size={14} /> Vinculando...
                                    </div>
                                ) : filteredClientsToLink.length > 0 ? (
                                    filteredClientsToLink.map(c => (
                                        <button 
                                            key={c.id}
                                            onClick={() => handleSelectClientToLink(c)}
                                            className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center justify-between group"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold truncate text-zinc-800 dark:text-zinc-200 group-hover:text-blue-700 dark:group-hover:text-blue-300">{c.nome}</p>
                                                <p className="text-xs text-zinc-500 truncate">{c.cpf || c.email || 'Sem dados extra'}</p>
                                            </div>
                                            <Check size={14} className="opacity-0 group-hover:opacity-100 text-blue-600" />
                                        </button>
                                    ))
                                ) : (
                                    linkSearchTerm.length > 0 ? (
                                        <div className="p-3 text-center text-xs text-zinc-400">Nenhum cliente encontrado.</div>
                                    ) : (
                                        <div className="p-3 text-center text-xs text-zinc-400">Digite para buscar...</div>
                                    )
                                )}
                           </div>
                       </div>
                   )}
                </div>

                <div className="bg-zinc-50/80 dark:bg-zinc-900/30 border-t border-zinc-100 dark:border-zinc-700 p-3">
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                          <ShieldCheck size={14} />
                       </div>
                       <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wide">Vendedor Responsável</p>
                          <div className="flex items-center gap-1">
                             <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate" title={`${sellerName}${sellerEmail ? ` - ${sellerEmail}` : ''}`}>
                                {sellerName} {sellerEmail && <span className="text-zinc-400 font-normal">- {sellerEmail}</span>}
                             </p>
                          </div>
                       </div>
                    </div>
                </div>
            </div>

            {/* Card 2: Payment Info */}
            <div className="flex flex-col gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 h-full flex flex-col justify-between">
                <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                    <CreditCard size={14} /> Detalhes Financeiros
                    </h3>
                    <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">Método:</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{currentSale.metodo_pagamento || 'Não informado'}</span>
                    </div>
                    <div className="my-1 border-t border-zinc-200 dark:border-zinc-700 border-dashed"></div>
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">Subtotal Itens (Válidos):</span>
                        <span className={`text-zinc-900 dark:text-white ${currentSale.status === 'cancelled' ? 'line-through opacity-60' : ''}`}>{formatCurrency(soldItemsSubtotal)}</span>
                    </div>
                    {totalPaymentDiscount > 0 && (
                        <div className={`flex justify-between text-sm text-green-600 dark:text-green-400 ${currentSale.status === 'cancelled' ? 'line-through opacity-60' : ''}`}>
                        <span>Desconto Pagamento:</span>
                        <span>- {formatCurrency(totalPaymentDiscount)}</span>
                        </div>
                    )}
                    {totalExtraDiscount > 0 && (
                        <div className={`flex justify-between text-sm text-blue-600 dark:text-blue-400 ${currentSale.status === 'cancelled' ? 'line-through opacity-60' : ''}`}>
                        <span>Desconto Extra:</span>
                        <span>- {formatCurrency(totalExtraDiscount)}</span>
                        </div>
                    )}
                    {giftCardUsed > 0 && (
                        <div className={`flex justify-between text-sm text-amber-600 dark:text-amber-400 ${currentSale.status === 'cancelled' ? 'line-through opacity-60' : ''}`}>
                        <span className="flex items-center gap-1"><Gift size={12} /> Vale Presente:</span>
                        <span>- {formatCurrency(giftCardUsed)}</span>
                        </div>
                    )}
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Total Pago Atual:</span>
                      <span className={`font-bold text-xl text-zinc-900 dark:text-white ${currentSale.status === 'cancelled' ? 'line-through decoration-red-500 decoration-2' : ''}`}>{formatCurrency(currentTotalPaid)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Parcelamento:</span>
                      <span>{getInstallmentText()}</span>
                    </div>
                </div>
              </div>

              {taxas && taxas.valor > 0 && (
                <div className="bg-red-50/50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                   <h3 className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-2 flex items-center gap-1">
                      <PieChart size={12} /> Custos da Operação (Maquininha)
                   </h3>
                   <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-600 dark:text-zinc-400">Taxa Aplicada ({taxas.porcentagem}%)</span>
                      <span className="text-red-600 dark:text-red-400 font-medium">- {formatCurrency(taxas.valor)}</span>
                   </div>
                   <div className="border-t border-red-100 dark:border-red-900/30 pt-1 mt-1 flex justify-between text-xs font-bold">
                      <span className="text-zinc-700 dark:text-zinc-300">Líquido Lojista:</span>
                      <span className="text-zinc-900 dark:text-white">{formatCurrency(valorLiquidoReal)}</span>
                   </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
              <Package size={16} className="text-zinc-500" /> Itens Adquiridos
            </h3>
            
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden flex flex-col">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 uppercase font-medium sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800">Produto</th>
                      <th className="px-4 py-3 text-center bg-zinc-50 dark:bg-zinc-800">Tam.</th>
                      <th className="px-4 py-3 text-center bg-zinc-50 dark:bg-zinc-800">Qtd</th>
                      <th className="px-4 py-3 text-center bg-zinc-50 dark:bg-zinc-800">Status</th>
                      <th className="px-4 py-3 text-right bg-zinc-50 dark:bg-zinc-800">Preço Un.</th>
                      <th className="px-4 py-3 text-center bg-zinc-50 dark:bg-zinc-800">Desc.</th>
                      <th className="px-4 py-3 text-right bg-zinc-50 dark:bg-zinc-800">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {unrolledItems.length > 0 ? (
                      unrolledItems.map((item) => {
                        const discountVal = item.desconto || 0;
                        const percent = item.preco_unitario > 0 ? (discountVal / item.preco_unitario) * 100 : 0;
                        const isReturned = item.status === 'returned';

                        return (
                          <tr key={item.virtualId} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 ${currentSale.status === 'cancelled' || isReturned ? 'opacity-60 grayscale bg-zinc-50/50 dark:bg-zinc-800/30' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-zinc-900 dark:text-white">{item.nome_produto}</div>
                              <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                <Tag size={10} />
                                <span>{item.marca}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="secondary">{item.tamanho}</Badge>
                            </td>
                            <td className="px-4 py-3 text-center font-mono">
                              {item.quantidade}
                            </td>
                            <td className="px-4 py-3 text-center">
                               {isReturned ? (
                                   <Badge variant="destructive" className="text-[10px] px-2 h-5">Devolvido</Badge>
                               ) : (
                                   <Badge variant="success" className="text-[10px] px-2 h-5">Vendido</Badge>
                               )}
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                              {formatCurrency(item.preco_unitario)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {percent > 0.5 ? (
                                <Badge variant="success" className="text-[10px] px-1.5 h-5">
                                  {Math.round(percent)}% OFF
                                </Badge>
                              ) : (
                                <span className="text-zinc-300 dark:text-zinc-700">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-white">
                              {formatCurrency(item.subtotal)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                          Detalhes dos itens não disponíveis.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-between shrink-0">
          <div>
            {currentSale.status !== 'cancelled' && (
              <Button 
                type="button"
                variant="destructive" 
                onClick={() => setIsReturnModalOpen(true)}
                disabled={isCancelling}
                className="gap-2"
              >
                <Undo2 size={16} /> Devolver Itens
              </Button>
            )}
          </div>
          <Button 
            onClick={onClose}
            variant="primary"
          >
            Fechar
          </Button>
        </div>
      </div>

      {/* MODAL DEDICADO DE DEVOLUÇÃO */}
      <ReturnItemsModal 
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        sale={currentSale}
        client={clientDetails}
        onConfirm={handleConfirmReturn}
        isLoading={isCancelling}
      />
    </div>
  );
};