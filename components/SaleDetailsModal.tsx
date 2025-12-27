
import React, { useState, useEffect, useMemo } from 'react';
import { X, User, CreditCard, Tag, Package, Receipt, Link, AlertTriangle, Mail, ShieldCheck, PieChart, Activity, Phone, Smartphone, Search, Loader2, Check, Gift, Undo2, Wallet, DollarSign, BookOpen, ShoppingBag, Hourglass, Banknote, CheckCircle2 } from 'lucide-react';
import { Sale, Client, SaleItem, UserProfile, PaymentFees } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { backendService } from '../services/backendService';
import { formatDateStandard } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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

    const extraDiscountPerUnit = useMemo(() => {
        const totalItems = sale.item_count || 1;
        const totalExtraDiscount = sale.desconto_extra || 0;
        return totalExtraDiscount / totalItems;
    }, [sale]);

    const unrolledItems = useMemo(() => {
        const list: (SaleItem & { virtualId: string; valorLiquidoEstorno: number })[] = [];
        sale.items?.forEach(item => {
            for (let i = 0; i < item.quantidade; i++) {
                const unitSubtotal = item.subtotal / item.quantidade;
                const netRefundValue = Math.max(0, unitSubtotal - extraDiscountPerUnit);

                list.push({
                    ...item,
                    quantidade: 1,
                    subtotal: unitSubtotal, 
                    valorLiquidoEstorno: netRefundValue,
                    valor_estorno_unitario: netRefundValue,
                    desconto: (item.desconto || 0) / item.quantidade,
                    virtualId: `${item.id}-${i}`
                });
            }
        });
        return list;
    }, [sale.items, extraDiscountPerUnit]);

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
    
    const totalPaidToRefund = selectedItems
        .filter(i => i.status_pagamento === 'pago')
        .reduce((acc, curr) => acc + curr.valorLiquidoEstorno, 0);
    
    const totalPendingToAbate = selectedItems
        .filter(i => i.status_pagamento !== 'pago')
        .reduce((acc, curr) => acc + curr.valorLiquidoEstorno, 0);

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

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Selecione os itens para devolução:</p>
                            <div className="space-y-2">
                                {availableItems.map(item => (
                                    <label 
                                        key={item.virtualId} 
                                        className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
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
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-zinc-500 uppercase font-bold">{item.tamanho}</span>
                                                    <span className="text-zinc-300">•</span>
                                                    {item.status_pagamento === 'pago' ? (
                                                        <Badge variant="success" className="text-[9px] h-4 px-1">Pago</Badge>
                                                    ) : (
                                                        <Badge variant="warning" className="text-[9px] h-4 px-1 gap-1"><DollarSign size={8} /> Pendente</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 block">{formatCurrency(item.valorLiquidoEstorno)}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}

                    {client && (
                        <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Resumo do Estorno</h4>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="flex justify-between items-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                                        <Gift size={12} className="text-amber-500" /> Crédito Vale Presente (Itens Pagos)
                                    </span>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(totalPaidToRefund)}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                                        <BookOpen size={12} className="text-blue-500" /> Abatimento de Dívida (Itens Pendentes)
                                    </span>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(totalPendingToAbate)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
                    <Button 
                        variant="destructive" 
                        className="w-full h-12 gap-2 shadow-lg" 
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
  const navigate = useNavigate();
  const [isCancelling, setIsCancelling] = useState(false);
  const [clientDetails, setClientDetails] = useState<Client | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [feesConfig, setFeesConfig] = useState<PaymentFees | null>(null);
  
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [isLinkingLoading, setIsLinkingLoading] = useState(false);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  useEffect(() => {
      setCurrentSale(sale);
      setIsLinkingMode(false);
      setLinkSearchTerm('');
  }, [sale, isOpen]);

  useEffect(() => {
    if (isOpen) {
        backendService.getUsers().then(setUsers);
        backendService.getPaymentFees().then(setFeesConfig);
        if (currentSale?.cliente_id) {
            backendService.getClients().then(clients => {
                const found = clients.find(c => c.id === currentSale.cliente_id);
                setClientDetails(found || null);
            });
        }
    } else {
        setClientDetails(null);
    }
  }, [isOpen, currentSale]);

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

  // --- LÓGICA DE TAXAS CONSOLIDADAS PARA CREDIÁRIO ---
  const consolidatedFees = useMemo(() => {
      if (!currentSale || currentSale.metodo_pagamento !== 'Crediário' || !feesConfig) return null;

      let totalFeeValue = 0;
      const history = currentSale.pagamentos_crediario || [];

      history.forEach(p => {
          let percent = 0;
          if (p.metodo === 'Cartão de Débito') percent = feesConfig.debit;
          else if (p.metodo === 'Cartão de Crédito') percent = feesConfig.credit_spot; // Consideramos à vista para recebimentos parciais

          totalFeeValue += (p.valor * (percent / 100));
      });

      return {
          valor: totalFeeValue,
          count: history.length
      };
  }, [currentSale, feesConfig]);

  if (!isOpen || !currentSale) return null;

  const { weekDay, dateTime } = formatDateStandard(currentSale.data_venda);
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Alteração solicitada: Subtotal Bruto agora mostra a soma dos Preços Unitários * Qtd de itens não devolvidos
  const soldItemsGrossSubtotal = currentSale.items?.filter(i => i.status === 'sold').reduce((acc, i) => acc + (i.preco_unitario * i.quantidade), 0) || 0;
  
  // O Total Líquido Final da venda continua sendo o que o lojista realmente recebeu (após descontos e vales)
  const soldItemsNetSubtotal = currentSale.items?.filter(i => i.status === 'sold').reduce((acc, i) => acc + i.subtotal, 0) || 0;
  const currentTotalNet = currentSale.status === 'cancelled' ? 0 : Math.max(0, soldItemsNetSubtotal - (currentSale.desconto_extra || 0) - (currentSale.uso_vale_presente || 0));
  
  const totalPaymentDiscount = currentSale.items?.filter(i => i.status === 'sold').reduce((acc, item) => acc + (item.desconto || 0), 0) || 0;
  const totalExtraDiscount = currentSale.desconto_extra || 0;
  const giftCardUsed = currentSale.uso_vale_presente || 0;

  const isCrediario = currentSale.metodo_pagamento === 'Crediário';
  
  const taxaExibicao = isCrediario ? (consolidatedFees?.valor || 0) : (currentSale.taxas_aplicadas?.valor || 0);
  const valorLiquidoReal = currentSale.valor_liquido_lojista || (currentTotalNet - taxaExibicao);
  
  const totalPaidInCrediario = currentSale.pagamentos_crediario?.reduce((acc, p) => acc + p.valor, 0) || 0;
  const liquidoRealCrediario = Math.max(0, totalPaidInCrediario - (consolidatedFees?.valor || 0));
  const valorFaltante = Math.max(0, currentTotalNet - totalPaidInCrediario);

  const isUnregistered = currentSale.cliente_nome === 'Cliente não cadastrado' || !currentSale.cliente_id;
  const sellerId = currentSale.responsavel || '';
  const matchedUser = users.find(u => u.id === sellerId);
  const displaySeller = matchedUser ? `${matchedUser.name} - ${matchedUser.email}` : 'Sistema';
  const displayId = currentSale.ui_id ? `#${currentSale.ui_id}` : currentSale.id.replace('s', '#');

  const isAllReturned = currentSale.items && currentSale.items.length > 0 && currentSale.items.every(i => i.status === 'returned');

  const handleStartLinking = async () => {
      setIsLinkingMode(true);
      if (clientsList.length === 0) {
          const loadedClients = await backendService.getClients();
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
          const success = await backendService.linkClientToSale(currentSale.id, client);
          if (success) {
              setCurrentSale(prev => prev ? ({ ...prev, cliente_id: client.id, cliente_nome: client.nome, cliente_cpf: client.cpf }) : null);
              setClientDetails(client);
              setIsLinkingMode(false);
              if (onSaleCancelled) onSaleCancelled();
          } else { alert("Erro ao vincular cliente."); }
      } catch (error) { console.error(error); alert("Erro técnico ao vincular."); }
      finally { setIsLinkingLoading(false); }
  };

  const handleConfirmReturn = async (selectedItems: SaleItem[]) => {
    setIsCancelling(true);
    const userId = currentUser?.id;
    if (!userId) { alert("Erro: Sessão do usuário não identificada."); setIsCancelling(false); return; }
    try {
        await backendService.returnSaleItems(currentSale.id, selectedItems, currentSale.cliente_id, userId);
        alert("Devolução processada com sucesso!");
        if (onSaleCancelled) onSaleCancelled();
        onClose();
    } catch (error) { console.error(error); alert("Erro ao processar devolução."); }
    finally { setIsCancelling(false); setIsReturnModalOpen(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-4xl overflow-hidden animate-fade-in-up border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg text-zinc-600 dark:text-zinc-300"><Receipt size={20} /></div>
            <div>
              <h2 className="text-lg font-bold text-zinc-800 dark:text-white flex items-baseline gap-2 flex-wrap">Detalhes da Venda {displayId}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{weekDay}, {dateTime}</p>
                <span className="text-zinc-300 dark:text-zinc-600">—</span>
                <div className="flex items-center gap-1.5">
                    {currentSale.status === 'cancelled' ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 h-4">Cancelada</Badge>
                    ) : isAllReturned ? (
                        <Badge variant="warning" className="text-[10px] px-1.5 h-4 gap-1"><Undo2 size={8} /> Devolvida</Badge>
                    ) : (
                        <Badge variant="success" className="text-[10px] px-1.5 h-4">Concluída</Badge>
                    )}
                    {currentSale.status !== 'cancelled' && !isAllReturned && (currentSale.status_pagamento === 'pago' ? <Badge variant="success" className="text-[10px] px-1.5 h-4 gap-1"><Check size={8} /> Pago</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 h-4 gap-1"><DollarSign size={8} /> Pagamento pendente</Badge>)}
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0 bg-white dark:bg-zinc-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD CLIENTE */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col h-full shadow-sm">
                <div className="bg-zinc-50 dark:bg-zinc-900/50 px-4 py-3 border-b border-zinc-100 dark:border-zinc-700 flex justify-between items-center">
                   <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase flex items-center gap-2"><User size={14} /> Cliente</h3>
                </div>
                <div className="p-5 flex-1 space-y-4">
                   {!isLinkingMode ? (
                       <>
                           <div className="flex items-start gap-4">
                              <div className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0 border border-zinc-200 dark:border-zinc-600 shadow-inner"><User size={28} /></div>
                              <div className="min-w-0 flex-1">
                                 <p className={`text-xl font-bold text-zinc-900 dark:text-white leading-tight ${currentSale.cliente_id ? 'hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer underline decoration-dotted transition-colors' : ''}`} onClick={() => { if (currentSale.cliente_id) { navigate(`/clients/${currentSale.cliente_id}/history`); onClose(); } }}>{currentSale.cliente_nome || 'Cliente Balcão'}</p>
                                 <div className="flex flex-col gap-2 mt-3">
                                    {(currentSale.cliente_cpf || clientDetails?.cpf) && (
                                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 w-fit px-2 py-1 rounded-md border border-zinc-100 dark:border-zinc-800">
                                        <CreditCard size={14} className="text-zinc-400" /> {currentSale.cliente_cpf || clientDetails?.cpf}
                                      </p>
                                    )}
                                    
                                    {clientDetails && (clientDetails.celular || clientDetails.telefone_fixo) && (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                          {clientDetails.celular ? <Smartphone size={14} className="text-zinc-400" /> : <Phone size={14} className="text-zinc-400" />}
                                          <span className="font-medium">{clientDetails.celular || clientDetails.telefone_fixo}</span>
                                        </p>
                                        {clientDetails.is_whatsapp && (
                                          <Badge variant="success" className="text-[10px] h-4 px-1.5 border-0">Whats</Badge>
                                        )}
                                      </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                           {isUnregistered && currentSale.status !== 'cancelled' && (
                              <Button variant="outline" size="sm" onClick={handleStartLinking} className="w-full text-xs h-8 border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all"><Link size={12} className="mr-1.5" /> Vincular a um cadastro</Button>
                           )}
                       </>
                   ) : (
                       <div className="animate-fade-in space-y-3">
                           <div className="flex items-center gap-2">
                               <div className="relative flex-1">
                                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                   <input type="text" placeholder="Buscar nome ou CPF..." className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" value={linkSearchTerm} onChange={(e) => setLinkSearchTerm(e.target.value)} autoFocus />
                               </div>
                               <Button variant="ghost" size="icon" onClick={() => setIsLinkingMode(false)} className="h-9 w-9 shrink-0"><X size={18} /></Button>
                           </div>
                           <div className="max-h-40 overflow-y-auto border border-zinc-100 dark:border-zinc-700 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                                {isLinkingLoading ? <div className="p-4 text-center text-zinc-500 flex items-center justify-center gap-2 text-xs"><Loader2 className="animate-spin" size={14} /> Vinculando...</div> : filteredClientsToLink.length > 0 ? filteredClientsToLink.map(c => (
                                    <button key={c.id} onClick={() => handleSelectClientToLink(c)} className="w-full text-left px-3 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex items-center justify-between group">
                                        <div className="min-w-0"><p className="text-sm font-bold truncate text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-700 dark:hover:text-emerald-400">{c.nome}</p><p className="text-xs text-zinc-500 dark:text-zinc-500 truncate">{c.cpf || c.email || 'Sem dados extra'}</p></div>
                                        <Check size={16} className="opacity-0 group-hover:opacity-100 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    </button>
                                )) : <div className="p-4 text-center text-xs text-zinc-400">{linkSearchTerm ? 'Nenhum encontrado' : 'Busque...'}</div>}
                           </div>
                       </div>
                   )}
                </div>
                <div className="bg-zinc-50/80 dark:bg-zinc-900/30 border-t border-zinc-100 dark:border-zinc-700 p-3">
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"><ShieldCheck size={14} /></div>
                       <div className="flex-1 min-w-0 flex flex-col justify-center"><p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-semibold tracking-wide">Vendedor</p><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{displaySeller}</p></div>
                    </div>
                </div>
            </div>

            {/* CARD FINANCEIRO */}
            <div className="flex flex-col gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 h-full flex flex-col justify-between shadow-sm">
                <div>
                    <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-400 uppercase mb-3 flex items-center gap-2"><CreditCard size={14} /> Resumo Financeiro</h3>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm"><span className="text-zinc-600 dark:text-zinc-400">Método de Venda:</span><span className="font-bold text-zinc-900 dark:text-white">{currentSale.metodo_pagamento}</span></div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">Subtotal Bruto:</span>
                        <span className={`text-zinc-900 dark:text-white ${currentSale.status === 'cancelled' || isAllReturned ? 'line-through opacity-60' : ''}`}>
                          {formatCurrency(soldItemsGrossSubtotal)}
                        </span>
                      </div>
                      {totalPaymentDiscount > 0 && <div className="flex justify-between text-sm text-green-600 dark:text-emerald-400"><span>Desconto Pagamento:</span><span>- {formatCurrency(totalPaymentDiscount)}</span></div>}
                      {totalExtraDiscount > 0 && <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400"><span>Desconto Extra:</span><span>- {formatCurrency(totalExtraDiscount)}</span></div>}
                      {giftCardUsed > 0 && <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400"><span className="flex items-center gap-1"><Gift size={12} /> Vale Presente:</span><span>- {formatCurrency(giftCardUsed)}</span></div>}
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex flex-col gap-2">
                    {isCrediario ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs uppercase">Total da Venda:</span>
                          <span className={`font-bold text-lg text-zinc-900 dark:text-white ${currentSale.status === 'cancelled' || isAllReturned ? 'line-through opacity-60' : ''}`}>{formatCurrency(currentTotalNet)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/30">
                          <span className="font-bold text-red-700 dark:text-red-400 text-xs uppercase">A Receber:</span>
                          <span className={`font-black text-xl text-red-600 dark:text-red-500 ${currentSale.status === 'cancelled' || isAllReturned ? 'line-through' : ''}`}>{formatCurrency(valorFaltante)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs uppercase">Total Pago:</span>
                          <span className={`font-black text-xl text-emerald-600 dark:text-emerald-500 ${currentSale.status === 'cancelled' || isAllReturned ? 'line-through' : ''}`}>{formatCurrency(totalPaidInCrediario)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center w-full">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Total Pago:</span>
                          <span className={`font-bold text-xl text-zinc-900 dark:text-white ${currentSale.status === 'cancelled' || isAllReturned ? 'line-through decoration-red-500 decoration-2' : ''}`}>{formatCurrency(currentTotalNet)}</span>
                        </div>
                        {currentSale.metodo_pagamento === 'Cartão de Crédito' && (currentSale.parcelas || 1) > 1 && (
                          <div className="flex justify-between items-center w-full py-1.5 px-3 bg-zinc-100 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-700/50 animate-fade-in">
                             <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">Parcelas:</span>
                             <span className="text-sm font-black text-zinc-700 dark:text-zinc-200">
                                {currentSale.parcelas}x de {formatCurrency(currentTotalNet / (currentSale.parcelas || 1))}
                             </span>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </div>

              {/* CUSTOS DA OPERAÇÃO (CONSOLIDADO PARA CREDIÁRIO) */}
              {taxaExibicao > 0 && (
                <div className="bg-red-50/50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30 animate-fade-in">
                   <h3 className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-2 flex items-center gap-1">
                      <PieChart size={12} /> {isCrediario ? `Taxas Acumuladas (${consolidatedFees?.count} recebimentos)` : 'Custos da Operação'}
                   </h3>
                   <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-600 dark:text-zinc-400">{isCrediario ? 'Total Taxas Bancárias' : `Taxa Aplicada (${currentSale.taxas_aplicadas?.porcentagem}%)`}</span>
                      <span className="text-red-600 dark:text-red-400 font-black">- {formatCurrency(taxaExibicao)}</span>
                   </div>
                   <div className="border-t border-red-200 dark:border-red-900/30 pt-1 mt-1 flex justify-between items-baseline">
                      <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Líquido Lojista {isCrediario && '(sobre o pago)'}:</span>
                      <span className="text-sm font-black text-zinc-900 dark:text-white">{formatCurrency(isCrediario ? liquidoRealCrediario : valorLiquidoReal)}</span>
                   </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2"><Package size={16} className="text-zinc-500 dark:text-zinc-400" /> Itens Adquiridos</h3>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden hidden sm:block">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 uppercase font-medium">
                    <tr>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3 text-center">Tam.</th>
                      <th className="px-4 py-3 text-center">Qtd</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Pagamento</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {unrolledItems.map((item) => {
                      const isReturned = item.status === 'returned';
                      return (
                        <tr key={item.virtualId} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 ${currentSale.status === 'cancelled' || isReturned ? 'opacity-60 grayscale bg-zinc-50/50 dark:bg-zinc-900/20' : ''}`}>
                          <td className="px-4 py-3"><div className="font-medium text-zinc-900 dark:text-white">{item.nome_produto}</div><div className="text-[10px] text-zinc-400 dark:text-zinc-400">{item.marca}</div></td>
                          <td className="px-4 py-3 text-center"><Badge variant="secondary" className="dark:bg-zinc-800 dark:text-zinc-300">{item.tamanho}</Badge></td>
                          <td className="px-4 py-3 text-center text-zinc-800 dark:text-zinc-200 font-bold">{item.quantidade}</td>
                          <td className="px-4 py-3 text-center">{isReturned ? <Badge variant="destructive" className="text-[9px]">Devolvido</Badge> : <Badge variant="success" className="text-[9px]">Vendido</Badge>}</td>
                          <td className="px-4 py-3 text-center">
                             {!isReturned && currentSale.status !== 'cancelled' && (item.status_pagamento === 'pago' ? <Badge variant="success" className="text-[9px] h-4 gap-1"><Check size={8} /> Pago</Badge> : <Badge variant="warning" className="text-[9px] h-4 px-1.5 gap-1"><DollarSign size={8} /> Pendente</Badge>)}
                          </td>
                          {/* Alteração solicitada: Subtotal do item agora mostra o valor bruto unitário (como qty é 1 no unrolledItems, preco_unitario é o suficiente) */}
                          <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(item.preco_unitario * item.quantidade)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
            {/* Mobile View Itens */}
            <div className="flex flex-col gap-3 sm:hidden">
              {unrolledItems.map((item) => {
                const isReturned = item.status === 'returned';
                return (
                  <div key={item.virtualId} className={`bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 ${currentSale.status === 'cancelled' || isReturned ? 'opacity-60 grayscale' : ''}`}>
                      <div className="flex justify-between items-start">
                          <span className="font-bold text-sm text-zinc-900 dark:text-white">{item.nome_produto}</span>
                          <Badge variant="outline" className="text-[9px] dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">{item.tamanho}</Badge>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-zinc-700 dark:text-zinc-200 font-bold">{formatCurrency(item.preco_unitario * item.quantidade)}</span>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Qtd: {item.quantidade}</span>
                             {isReturned ? <Badge variant="destructive" className="text-[8px]">Devolvido</Badge> : (item.status_pagamento === 'pago' ? <Badge variant="success" className="text-[8px]">Pago</Badge> : <Badge variant="warning" className="text-[8px]">Pendente</Badge>)}
                          </div>
                      </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-between shrink-0">
          <div>{currentSale.status !== 'cancelled' && !isAllReturned && <Button type="button" variant="destructive" onClick={() => setIsReturnModalOpen(true)} disabled={isCancelling} className="gap-2 shadow-sm"><Undo2 size={16} /> Devolver Itens</Button>}</div>
          <Button onClick={onClose} variant="primary" className="px-8 shadow-sm">Fechar</Button>
        </div>
      </div>
      <ReturnItemsModal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} sale={currentSale} client={clientDetails} onConfirm={handleConfirmReturn} isLoading={isCancelling} />
    </div>
  );
};
