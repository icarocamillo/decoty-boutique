
import { useParams, useNavigate } from 'react-router-dom';
import { Client, Sale, StockEntry, UserProfile, Product } from '../types';
import { backendService } from '../services/backendService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ArrowLeft, ShoppingBag, Calendar, CreditCard, User, Mail, Phone, Shirt, Loader2, Undo2, History, Gift, Plus, BookOpen, Wallet, Clock, Tag, ChevronRight } from 'lucide-react';
import { RecentSales } from './RecentSales';
import { Badge } from './ui/Badge';
import { formatDateStandard } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { GiftCardAdjustmentModal } from './GiftCardAdjustmentModal';
import { CrediarioPaymentModal } from './CrediarioPaymentModal';
import React, { useEffect, useState, useMemo } from 'react';

interface ClientHistoryPageProps {
  onUpdate?: () => void;
}

export const ClientHistoryPage: React.FC<ClientHistoryPageProps> = ({ onUpdate }) => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [provadorHistory, setProvadorHistory] = useState<(StockEntry & { displayId: string })[]>([]);
  const [fullStockHistory, setFullStockHistory] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isCrediarioModalOpen, setIsCrediarioModalOpen] = useState(false);

  const loadData = async () => {
    if (!clientId) return;
    try {
      const [clientsData, allSales, clientStock, usersData, productsData] = await Promise.all([
        backendService.getClients(),
        backendService.getClientSales(clientId),
        backendService.getClientStockHistory(clientId),
        backendService.getUsers(),
        backendService.getProducts()
      ]);

      const foundClient = clientsData.find(c => c.id === clientId);
      setClient(foundClient || null);
      setSales(allSales);
      setUsers(usersData);
      setProducts(productsData);

      // 1. Histórico Completo Ordenado para a tabela geral
      const sortedHistory = [...clientStock].sort((a, b) => 
        new Date(b.data_entrada).getTime() - new Date(a.data_entrada).getTime()
      );
      setFullStockHistory(sortedHistory);

      // 2. Lógica de Pendências de Provador (Pareamento Cirúrgico)
      const cronoHistory = [...clientStock].sort((a, b) => 
        new Date(a.data_entrada).getTime() - new Date(b.data_entrada).getTime()
      );

      const outgoingUnits: (StockEntry & { displayId: string; productKey: string; matched?: boolean })[] = [];
      const incomingUnits: { productKey: string }[] = [];

      cronoHistory.forEach(entry => {
          const motivoLower = (entry.motivo || '').toLowerCase();
          const productKey = entry.produto_id || entry.produto_nome;
          const qty = Math.abs(entry.quantidade);
          
          // --- DETECÇÃO DE SAÍDA PARA PROVADOR ---
          const isFittingRoomWithdrawal = motivoLower.includes('provador') && entry.quantidade < 0;

          if (isFittingRoomWithdrawal) {
              for (let i = 0; i < qty; i++) {
                  outgoingUnits.push({
                      ...entry,
                      displayId: `${entry.id}-${i}`,
                      productKey,
                      quantidade: -1,
                      matched: false
                  });
              }
          } 
          // --- DETECÇÃO DE RETORNO DE PROVADOR ---
          else if (entry.quantidade > 0 && motivoLower.includes('provador')) {
              for (let i = 0; i < qty; i++) {
                  incomingUnits.push({ productKey });
              }
          }
      });

      incomingUnits.forEach(inc => {
          const matchIdx = outgoingUnits.findIndex(out => out.productKey === inc.productKey && !out.matched);
          if (matchIdx !== -1) {
              outgoingUnits[matchIdx].matched = true;
          }
      });

      const pending = outgoingUnits.filter(u => !u.matched).reverse();
      setProvadorHistory(pending);

    } catch (error) {
      console.error("Erro ao carregar histórico do cliente", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const resolveUserName = (userId: string) => {
    const profile = users.find(u => u.id === userId);
    if (profile) return profile.name;
    if (userId?.length > 30) return 'Usuário';
    return userId || 'Sistema';
  };

  const salesMapping = useMemo(() => {
    const mapping: Record<string, number> = {};
    sales.forEach(s => {
      if (s.ui_id) mapping[s.id] = s.ui_id;
    });
    return mapping;
  }, [sales]);

  const formatMotivo = (motivo: string) => {
    if (!motivo) return '';
    const idMatch = motivo.match(/#([\w-]+)/);
    if (!idMatch) return motivo;
    const extractedId = idMatch[1];
    if (salesMapping[extractedId]) {
      return motivo.replace(`#${extractedId}`, `#${salesMapping[extractedId]}`);
    }
    return motivo;
  };

  const handleReturnProvador = async (e: React.MouseEvent, entry: StockEntry & { displayId: string }) => {
    if (e && e.stopPropagation) e.stopPropagation();
    
    setProcessingId(entry.displayId);
    const userId = user?.id || '';
    
    try {
        const success = await backendService.returnProvadorItem(entry, userId);
        if (success) {
            alert("Item retornado ao estoque com sucesso!");
            if (onUpdate) onUpdate();
            loadData(); 
        } else {
            alert("Erro: Não foi possível realizar a devolução. Verifique se o produto ainda existe.");
        }
    } catch (error: any) {
        console.error(error);
        alert("Erro técnico ao devolver item.");
    } finally {
        setProcessingId(null);
    }
  };

  const getProductDetails = (entry: StockEntry) => {
    const product = products.find(p => p.id === entry.produto_id);
    return {
      tamanho: product?.tamanho || '-',
      cor: product?.cor || '-'
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500 animate-pulse">
        <Loader2 size={32} className="animate-spin mb-2" />
        <p>Carregando histórico...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-zinc-800 dark:text-white mb-4">Cliente não encontrado</h2>
        <Button onClick={() => navigate('/clients')}>Voltar</Button>
      </div>
    );
  }

  const totalSpent = sales.reduce((acc, curr) => acc + (curr.status !== 'cancelled' ? curr.valor_total : 0), 0);
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const totalPurchases = sales.filter(s => s.status !== 'cancelled').length;
  const lastPurchaseDate = sales.length > 0 ? new Date(sales[0].data_venda).toLocaleDateString('pt-BR') : '-';

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Histórico de Compras</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Visão detalhada do cliente {client.nome}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-l-4 border-l-blue-500">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shadow-inner">
                <User size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{client.nome}</h3>
                {client.cpf && <p className="text-xs text-zinc-500 font-mono">CPF: {client.cpf}</p>}
              </div>
            </div>
            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
               {client.email && <div className="flex items-center gap-2"><Mail size={14} /> {client.email}</div>}
               {(client.celular || client.telefone_fixo) && (
                 <div className="flex items-center gap-2 flex-wrap">
                   <Phone size={14} /> 
                   <span>{client.celular || client.telefone_fixo}</span>
                   {client.is_whatsapp && (
                     <Badge variant="success" className="text-[10px] h-4 px-1.5 border-0">Whats</Badge>
                   )}
                 </div>
               )}
               <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Aceita Ofertas:</span>
                    {client.receber_ofertas ? <Badge variant="info" className="text-[10px] border-0">Sim</Badge> : <Badge variant="secondary" className="text-[10px]">Não</Badge>}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Status Provador:</span>
                    {client.pode_provador ? <Badge variant="purple" className="text-[10px] border-0">Autorizado</Badge> : <Badge variant="secondary" className="text-[10px]">Não Autorizado</Badge>}
                  </div>
               </div>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2">
           <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 p-4 h-full items-stretch">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl text-center flex flex-col justify-between border border-transparent dark:border-zinc-700/50">
                 <div className="text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-bold mb-1 flex items-center justify-center gap-1"><ShoppingBag size={14} /> Qtd Compras</div>
                 <div className="text-xl font-bold text-zinc-900 dark:text-white">{totalPurchases}</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl text-center flex flex-col justify-between border border-transparent dark:border-zinc-700/50">
                 <div className="text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-bold mb-1 flex items-center justify-center gap-1"><CreditCard size={14} /> Valor Gasto</div>
                 <div className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalSpent)}</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl text-center flex flex-col justify-between border border-transparent dark:border-zinc-700/50">
                 <div className="text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-bold mb-1 flex items-center justify-center gap-1"><Calendar size={14} /> Última Compra</div>
                 <div className="text-lg font-bold text-zinc-900 dark:text-white truncate">{lastPurchaseDate}</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl text-center flex flex-col justify-between relative group">
                 <div className="text-amber-600 dark:text-amber-400 text-[10px] uppercase font-bold mb-1 flex items-center justify-center gap-1"><Gift size={14} /> Vale Presente</div>
                 <div className="text-xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(client.saldo_vale_presente || 0)}</div>
                 <button onClick={() => setIsGiftModalOpen(true)} className="w-full mt-2 text-[10px] font-bold bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 rounded py-1 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors flex items-center justify-center gap-1">Gerenciar Saldo</button>
              </div>
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-xl text-center flex flex-col justify-between">
                <div className="text-red-600 dark:text-red-400 text-[10px] uppercase font-bold mb-1 flex items-center justify-center gap-1"><BookOpen size={14} /> Saldo Crediário</div>
                <div className="text-xl font-bold text-red-700 dark:text-red-400">{formatCurrency(client.saldo_devedor_crediario || 0)}</div>
                <button onClick={() => setIsCrediarioModalOpen(true)} className="w-full mt-2 text-[10px] font-bold bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-400 rounded py-1 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors flex items-center justify-center gap-1">Gerenciar Saldo</button>
              </div>
           </div>
        </Card>
      </div>

      {/* SEÇÃO: ITENS EM PROVADOR (Pendente) */}
      {provadorHistory.length > 0 && (
          <Card 
            title={<div className="flex items-center gap-2 text-purple-700 dark:text-purple-400"><Shirt size={20} /> Em Provador (Pendente)</div>}
            description="Peças retiradas para provar que ainda não foram retornadas ao estoque"
            className="border-l-4 border-l-purple-500 animate-fade-in"
          >
             <div className="overflow-hidden">
                {/* MOBILE VIEW: Card List */}
                <div className="flex flex-col gap-3 sm:hidden pb-1">
                  {provadorHistory.map((unit) => {
                    const { weekDay, dateTime } = formatDateStandard(unit.data_entrada);
                    const responsibleName = resolveUserName(unit.responsavel);
                    const isProcessing = processingId === unit.displayId;
                    const details = getProductDetails(unit);

                    return (
                      <div key={unit.displayId} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col gap-3 animate-fade-in-up">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm truncate">{unit.produto_nome}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 text-[10px]">Tam: {details.tamanho}</Badge>
                              <Badge variant="outline" className="text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 text-[10px]">Cor: {details.cor}</Badge>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="success" 
                            className="h-9 px-3 text-xs gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95 transition-all border-0" 
                            onClick={(e) => handleReturnProvador(e, unit)} 
                            disabled={isProcessing}
                          >
                            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <><Undo2 size={14} /> Devolver</>}
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                           <div className="flex flex-col gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                              <div className="flex items-center gap-1"><Calendar size={12} className="text-zinc-400 shrink-0" /><span>{weekDay}</span></div>
                              <div className="flex items-center gap-1"><Clock size={12} className="text-zinc-400 shrink-0" /><span>{dateTime.split(' às ')[1]}</span></div>
                           </div>
                           <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-800">
                             <Badge variant="purple" className="w-5 h-5 p-0 rounded-full flex items-center justify-center text-[8px] border-0">{responsibleName.substring(0, 2).toUpperCase()}</Badge>
                             <span className="truncate max-w-[80px] dark:text-zinc-300">{responsibleName}</span>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DESKTOP VIEW: Table */}
                <div className="hidden sm:block overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm text-left">
                      <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 backdrop-blur-sm z-10">
                          <tr>
                              <th className="px-6 py-3 font-medium">Data Retirada</th>
                              <th className="px-6 py-3 font-medium">Produto</th>
                              <th className="px-6 py-3 font-medium text-center">Tamanho</th>
                              <th className="px-6 py-3 font-medium text-center">Cor</th>
                              <th className="px-6 py-3 font-medium">Responsável</th>
                              <th className="px-6 py-3 font-medium text-center">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {provadorHistory.map((unit) => {
                              const { weekDay, dateTime } = formatDateStandard(unit.data_entrada);
                              const responsibleName = resolveUserName(unit.responsavel);
                              const isProcessing = processingId === unit.displayId;
                              const details = getProductDetails(unit);

                              return (
                                  <tr key={unit.displayId} className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors bg-white dark:bg-zinc-900">
                                      <td className="px-6 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400 text-xs"><div className="flex flex-col"><span className="font-bold">{weekDay}</span><span>{dateTime}</span></div></td>
                                      <td className="px-6 py-3 font-medium text-zinc-900 dark:text-white">{unit.produto_nome}</td>
                                      <td className="px-6 py-3 text-center"><Badge variant="outline" className="text-zinc-600 dark:text-zinc-300">{details.tamanho}</Badge></td>
                                      <td className="px-6 py-3 text-center text-zinc-600 dark:text-zinc-400 text-xs">{details.cor}</td>
                                      <td className="px-6 py-3 text-zinc-500 dark:text-zinc-400 text-xs"><div className="flex items-center gap-1.5"><Badge variant="secondary" className="w-6 h-6 p-0 rounded-full flex items-center justify-center text-[8px] font-bold">{responsibleName.substring(0, 2).toUpperCase()}</Badge><span className="font-medium">{responsibleName}</span></div></td>
                                      <td className="px-6 py-3 text-center">
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="h-8 text-xs border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-300 gap-1" 
                                          onClick={(e) => handleReturnProvador(e, unit)} 
                                          disabled={isProcessing}
                                        >
                                          {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <><Undo2 size={12} /> Devolver</>}
                                        </Button>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
                </div>
             </div>
          </Card>
      )}

      {/* Histórico Geral de Estoque */}
      <Card title={<div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300"><History size={20} /> Histórico Geral de Estoque</div>} description="Logs de todas as movimentações registradas para este cliente">
         <div className="overflow-x-auto max-h-[450px]">
            {fullStockHistory.length === 0 ? <div className="p-6 text-center text-zinc-500 italic">Nenhuma movimentação de estoque registrada.</div> : (
                <>
                  <div className="flex flex-col gap-3 sm:hidden p-1 bg-zinc-50 dark:bg-zinc-950/50">
                    {fullStockHistory.map((entry) => {
                      const isEntry = entry.quantidade > 0;
                      const { weekDay, dateTime } = formatDateStandard(entry.data_entrada);
                      const responsibleName = resolveUserName(entry.responsavel);
                      const displayMotivo = formatMotivo(entry.motivo);
                      return (
                        <div key={entry.id} className={`text-left p-4 rounded-xl border bg-white dark:bg-zinc-900 shadow-sm transition-all flex flex-col gap-3 ${isEntry ? 'border-green-100 dark:border-green-900/30' : 'border-zinc-100 dark:border-zinc-800'}`}>
                          <div className="flex justify-between items-start"><div className="flex flex-col min-w-0 flex-1 pr-2"><h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm truncate">{entry.produto_nome}</h3><p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 italic"><Tag size={10} className="text-zinc-400" /> {displayMotivo}</p></div><Badge variant={isEntry ? "success" : "destructive"} className="text-[10px] shrink-0">{isEntry ? '+' : ''}{entry.quantidade} un</Badge></div>
                          <div className="flex items-center justify-between mt-1 pt-2 border-t border-zinc-50 dark:border-zinc-800"><div className="flex flex-col gap-1 text-[10px] text-zinc-400"><div className="flex items-center gap-1"><Calendar size={10} className="shrink-0" /><span className="truncate">{weekDay.split('-')[0]}</span></div><div className="flex items-center gap-1"><Clock size={10} className="shrink-0" /><span>{dateTime.split(' às ')[1]}</span></div></div><div className="flex items-center gap-2"><div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium"><Badge variant="secondary" className="w-5 h-5 p-0 rounded-full flex items-center justify-center text-[8px] font-bold">{responsibleName.substring(0, 2).toUpperCase()}</Badge><span className="dark:text-zinc-300">{responsibleName}</span></div></div></div>
                        </div>
                      );
                    })}
                  </div>
                  <table className="hidden sm:table w-full text-sm text-left">
                      <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 backdrop-blur-sm z-10">
                          <tr><th className="px-6 py-3 font-medium">Data / Hora</th><th className="px-6 py-3 font-medium">Produto</th><th className="px-6 py-3 font-medium text-center">Qtd</th><th className="px-6 py-3 font-medium">Motivo</th><th className="px-6 py-3 font-medium">Responsável</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {fullStockHistory.map((entry) => {
                              const { dateTime } = formatDateStandard(entry.data_entrada);
                              const isEntry = entry.quantidade > 0;
                              const responsibleName = resolveUserName(entry.responsavel);
                              return (
                                  <tr key={entry.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors bg-white dark:bg-zinc-900"><td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap text-xs">{dateTime}</td><td className="px-6 py-3 font-medium text-zinc-900 dark:text-white">{entry.produto_nome}</td><td className="px-6 py-3 text-center"><Badge variant={isEntry ? "success" : "destructive"}>{isEntry ? '+' : ''}{entry.quantidade}</Badge></td><td className="px-6 py-3 text-xs text-zinc-500">{formatMotivo(entry.motivo)}</td><td className="px-6 py-3 text-xs text-zinc-500 italic">{responsibleName}</td></tr>
                              );
                          })}
                      </tbody>
                  </table>
                </>
            )}
         </div>
      </Card>

      <Card title="Vendas Realizadas (Financeiro)">
         <RecentSales sales={sales} onUpdate={loadData} />
      </Card>

      <GiftCardAdjustmentModal isOpen={isGiftModalOpen} onClose={() => setIsGiftModalOpen(false)} onSuccess={loadData} clientId={client.id} clientName={client.nome} currentBalance={client.saldo_vale_presente || 0} />
      <CrediarioPaymentModal isOpen={isCrediarioModalOpen} onClose={() => setIsCrediarioModalOpen(false)} onSuccess={loadData} client={client} sales={sales} />
    </div>
  );
};
