import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client, Sale, StockEntry } from '../types';
import { mockService } from '../services/mockService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ArrowLeft, ShoppingBag, Calendar, CreditCard, User, Mail, Phone, Shirt, Loader2, Undo2, ArrowUpCircle, ArrowDownCircle, History, Gift, Plus } from 'lucide-react';
import { RecentSales } from './RecentSales';
import { Badge } from './ui/Badge';
import { formatDateStandard } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { GiftCardAdjustmentModal } from './GiftCardAdjustmentModal';

interface ClientHistoryPageProps {
  onUpdate?: () => void;
}

export const ClientHistoryPage: React.FC<ClientHistoryPageProps> = ({ onUpdate }) => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [provadorHistory, setProvadorHistory] = useState<StockEntry[]>([]);
  const [fullStockHistory, setFullStockHistory] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);

  const recentlyReturnedIdsRef = useRef<Set<string>>(new Set());

  const loadData = async () => {
    if (!clientId) return;
    try {
      const [clients, allSales, clientStock] = await Promise.all([
        mockService.getClients(),
        mockService.getClientSales(clientId),
        mockService.getClientStockHistory(clientId)
      ]);

      const foundClient = clients.find(c => c.id === clientId);
      setClient(foundClient || null);
      setSales(allSales);

      const sortedEntries = [...clientStock].sort((a, b) => 
        new Date(a.data_entrada).getTime() - new Date(b.data_entrada).getTime()
      );

      setFullStockHistory([...sortedEntries].reverse());

      const returnsPool: Record<string, number> = {};

      sortedEntries.forEach(entry => {
         const isReturn = entry.quantidade > 0 && (
            entry.motivo.includes('Retorno Provador') || 
            entry.motivo.includes('Devolução')
         );

         if (isReturn) {
             const key = entry.produto_id || entry.produto_nome;
             returnsPool[key] = (returnsPool[key] || 0) + entry.quantidade;
         }
      });

      const pendingItems: StockEntry[] = [];

      sortedEntries.forEach(entry => {
          const isOut = entry.quantidade < 0 && (
             entry.motivo.includes('Provador') || 
             (entry.motivo.includes('Saída Manual') && !entry.motivo.includes('Venda'))
          );

          if (isOut) {
              if (entry.motivo.includes('(Devolvido)') || recentlyReturnedIdsRef.current.has(entry.id)) {
                  return;
              }

              const key = entry.produto_id || entry.produto_nome;
              const qtyOut = Math.abs(entry.quantidade);
              
              const creditAvailable = returnsPool[key] || 0;

              if (creditAvailable >= qtyOut) {
                  returnsPool[key] -= qtyOut;
              } else {
                  const remaining = qtyOut - creditAvailable;
                  returnsPool[key] = 0;
                  pendingItems.push({
                      ...entry,
                      quantidade: -remaining
                  });
              }
          }
      });
      
      setProvadorHistory(pendingItems.reverse());

    } catch (error) {
      console.error("Erro ao carregar histórico do cliente", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [clientId]);

  const formatResponsibleAndReason = (entry: StockEntry) => {
    const userPart = entry.responsavel.split('@')[0];
    const displayUser = entry.responsavel.includes('@') ? userPart : entry.responsavel;
    const rawMotivo = entry.motivo || '';

    if (rawMotivo.includes('Cancelamento de Venda') || rawMotivo.includes('Devolução de Venda')) {
      const idMatch = rawMotivo.match(/#([\w-]+)/);
      const extractedId = idMatch ? idMatch[1] : '?';
      
      const sale = sales.find(s => s.id === extractedId || s.sales_id?.toString() === extractedId);
      const finalSalesId = sale?.sales_id ? sale.sales_id.toString() : extractedId;
      
      const typeLabel = rawMotivo.includes('Cancelamento') ? 'Cancelamento de Venda' : 'Devolução de Venda';
      
      return {
        top: `${displayUser} - Venda #${finalSalesId}`,
        bottom: `(Entrada - ${typeLabel})`
      };
    }

    return {
      top: displayUser,
      bottom: rawMotivo
    };
  };

  const handleReturnProvador = async (e: React.MouseEvent, entry: StockEntry) => {
    if (e && e.stopPropagation) e.stopPropagation();
    
    setProcessingId(entry.id);
    const userName = user?.user_metadata?.name || 'Usuário';

    setProvadorHistory(current => current.filter(item => item.id !== entry.id));
    recentlyReturnedIdsRef.current.add(entry.id);

    try {
        const success = await mockService.returnProvadorItem(entry, userName);
        
        if (!success) throw new Error("Falha ao registrar devolução no banco de dados.");

        // Notifica o app global para atualizar estoque em outras telas
        if (onUpdate) onUpdate();

        setTimeout(() => {
            loadData();
        }, 1000);

    } catch (error: any) {
        console.error("Erro ao devolver item:", error);
        alert(error.message || "Erro desconhecido ao devolver item.");
        recentlyReturnedIdsRef.current.delete(entry.id);
        loadData(); 
    } finally {
        setProcessingId(null);
    }
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
        <Button onClick={() => navigate('/clients')}>Voltar para Clientes</Button>
      </div>
    );
  }

  const totalSpent = sales.reduce((acc, curr) => acc + (curr.status !== 'cancelled' ? curr.valor_total : 0), 0);
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
          <p className="text-zinc-500 dark:text-zinc-400">Visão detalhada do cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-l-4 border-l-blue-500">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 relative">
                <User size={24} />
                {client.pode_provador && (
                    <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white rounded-full p-1 border border-white dark:border-zinc-800" title="Permissão Provador Ativa">
                        <Shirt size={10} />
                    </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{client.nome}</h3>
                {client.cpf && <p className="text-xs text-zinc-500 font-mono">CPF: {client.cpf}</p>}
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
               {client.email && (
                 <div className="flex items-center gap-2">
                   <Mail size={14} /> {client.email}
                 </div>
               )}
               {(client.celular || client.telefone_fixo) && (
                 <div className="flex items-center gap-2">
                   <Phone size={14} /> {client.celular || client.telefone_fixo}
                 </div>
               )}
               
               <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2 space-y-2">
                  <div className="flex justify-between items-center">
                     <span className="text-xs text-zinc-500">Aceita Ofertas:</span>
                     {client.receber_ofertas ? (
                         <Badge variant="success" className="text-[10px]">Sim</Badge>
                     ) : (
                         <Badge variant="secondary" className="text-[10px]">Não</Badge>
                     )}
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-xs text-zinc-500">Status Provador:</span>
                     {client.pode_provador ? (
                         <Badge variant="success" className="text-[10px]">Autorizado</Badge>
                     ) : (
                         <Badge variant="secondary" className="text-[10px]">Não Autorizado</Badge>
                     )}
                  </div>
               </div>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2">
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl text-center flex flex-col justify-between h-full">
                 <div className="text-zinc-500 dark:text-zinc-400 text-xs uppercase font-bold mb-1 flex items-center justify-center gap-1">
                   <ShoppingBag size={14} /> Quantidade de Compras
                 </div>
                 <div className="text-xl font-bold text-zinc-900 dark:text-white">{totalPurchases}</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl text-center flex flex-col justify-between h-full">
                 <div className="text-zinc-500 dark:text-zinc-400 text-xs uppercase font-bold mb-1 flex items-center justify-center gap-1">
                   <CreditCard size={14} /> Valor Gasto
                 </div>
                 <div className="text-xl font-bold text-green-600 dark:text-green-400">
                   {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalSpent)}
                 </div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl text-center flex flex-col justify-between h-full">
                 <div className="text-zinc-500 dark:text-zinc-400 text-xs uppercase font-bold mb-1 flex items-center justify-center gap-1">
                   <Calendar size={14} /> Última Compra
                 </div>
                 <div className="text-lg font-bold text-zinc-900 dark:text-white truncate">{lastPurchaseDate}</div>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl text-center flex flex-col justify-between h-full relative group">
                 <div className="text-amber-600 dark:text-amber-400 text-[10px] uppercase font-bold mb-1 flex items-center justify-center gap-1">
                   <Gift size={14} /> Vale Presente
                 </div>
                 <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 my-1">
                   {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.saldo_vale_presente || 0)}
                 </div>
                 <button 
                    onClick={() => setIsGiftModalOpen(true)}
                    className="w-full mt-auto text-xs font-medium bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 rounded-md py-2 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors flex items-center justify-center gap-2"
                 >
                    <Plus size={12} /> Gerar Saldo
                 </button>
              </div>
           </div>
        </Card>
      </div>

      {provadorHistory.length > 0 && (
          <Card 
            title={
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                    <Shirt size={20} /> Em Provador (Pendente)
                </div>
            }
            description="Peças retiradas que ainda não foram devolvidas (Conciliação Automática)"
            className="border-l-4 border-l-purple-500"
          >
             <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 backdrop-blur-sm z-10">
                        <tr>
                            <th className="px-6 py-3 font-medium">Data Retirada</th>
                            <th className="px-6 py-3 font-medium">Produto</th>
                            <th className="px-6 py-3 font-medium text-center">Qtd Pendente</th>
                            <th className="px-6 py-3 font-medium">Responsável</th>
                            <th className="px-6 py-3 font-medium text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {provadorHistory.map((entry) => {
                            const { weekDay, dateTime } = formatDateStandard(entry.data_entrada);

                            return (
                                <tr key={entry.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors">
                                    <td className="px-6 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                                        <div className="flex flex-col text-xs">
                                            <span className="font-bold">{weekDay}</span>
                                            <span>{dateTime}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 font-medium text-zinc-900 dark:text-white">
                                        {entry.produto_nome}
                                    </td>
                                    <td className="px-6 py-3 text-center text-red-600 font-bold">
                                        {Math.abs(entry.quantidade)}
                                    </td>
                                    <td className="px-6 py-3 text-zinc-500 dark:text-zinc-400 text-xs">
                                        {entry.responsavel.split('@')[0]}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                      <Button 
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-300 gap-1 mx-auto"
                                          onClick={(e) => handleReturnProvador(e, entry)}
                                          disabled={processingId === entry.id}
                                          title="Registrar retorno desta peça"
                                      >
                                          {processingId === entry.id ? (
                                              "..."
                                          ) : (
                                              <><Undo2 size={12} /> Devolver</>
                                          )}
                                      </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
          </Card>
      )}

      <Card 
        title={
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <History size={20} /> Histórico de Movimentações
            </div>
        }
        description="Todas as entradas e saídas de estoque registradas para este cliente"
      >
         <div className="overflow-x-auto max-h-[300px]">
            {fullStockHistory.length === 0 ? (
                <div className="p-6 text-center text-zinc-500">Nenhuma movimentação registrada.</div>
            ) : (
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 backdrop-blur-sm z-10">
                        <tr>
                            <th className="px-6 py-3 font-medium">Data</th>
                            <th className="px-6 py-3 font-medium">Produto</th>
                            <th className="px-6 py-3 font-medium text-center">Qtd</th>
                            <th className="px-6 py-3 font-medium">Responsável / Motivo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {fullStockHistory.map((entry) => {
                            const { dateTime } = formatDateStandard(entry.data_entrada);
                            const isEntry = entry.quantidade > 0;
                            const isProvadorMovement = entry.motivo.includes('Provador');
                            const { top, bottom } = formatResponsibleAndReason(entry);

                            return (
                                <tr key={entry.id} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors ${isProvadorMovement ? 'bg-purple-50/20 dark:bg-purple-900/5' : ''}`}>
                                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap text-xs">
                                        {dateTime}
                                    </td>
                                    <td className="px-6 py-3 font-medium text-zinc-900 dark:text-white">
                                        {entry.produto_nome}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            isEntry 
                                            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800' 
                                            : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800'
                                        }`}>
                                            {isEntry ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
                                            {isEntry ? '+' : ''}{entry.quantidade}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                            <span className={`text-xs font-bold ${isProvadorMovement ? 'text-purple-700 dark:text-purple-300' : 'text-zinc-900 dark:text-white'}`}>
                                                {top}
                                            </span>
                                            <span className={`text-[10px] ${isProvadorMovement ? 'text-purple-600/80 dark:text-purple-400/80' : 'text-zinc-500'}`}>
                                                {bottom}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
         </div>
      </Card>

      <Card title="Transações Realizadas" description="Histórico de vendas finalizadas">
         <RecentSales sales={sales} onUpdate={onUpdate} />
      </Card>

      <GiftCardAdjustmentModal 
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
        onSuccess={() => { loadData(); if(onUpdate) onUpdate(); }} 
        clientId={client.id}
        clientName={client.nome}
        currentBalance={client.saldo_vale_presente || 0}
      />
    </div>
  );
};