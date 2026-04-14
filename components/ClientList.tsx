import React, { useState, useMemo, useEffect } from 'react';
import { Client, StockEntry } from '../types';
import { User, Phone, Mail, UserPlus, Smartphone, MapPin, Megaphone, Search, Filter, CreditCard, Pencil, Shirt, Gift, ChevronRight, BookOpen } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ClientFormModal } from './ClientFormModal';
import { Pagination } from './ui/Pagination';
import { formatDateStandard } from '../utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { useData } from '../contexts/DataContext';

export const ClientList: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { clients, refreshData } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDebt, setFilterDebt] = useState('all'); // 'all' | 'positive'
  const [filterBalance, setFilterBalance] = useState('all'); // 'all' | 'positive'
  const [filterProvador, setFilterProvador] = useState('all'); // 'all' | 'true' | 'false' | 'pending'
  const [filterWhatsApp, setFilterWhatsApp] = useState('all'); // 'all' | 'true' | 'false'
  const [filterOffers, setFilterOffers] = useState('all'); // 'all' | 'true' | 'false'

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDebt, filterBalance, filterProvador, filterWhatsApp, filterOffers, itemsPerPage]);

  const handleHistorySelect = (clientId: string) => {
    navigate(`/clients/${clientId}/history`);
  };

  const filteredClients = useMemo(() => {
    let result = clients.filter(client => {
      // 1. Text Search (Name, Email or CPF)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        client.nome.toLowerCase().includes(searchLower) || 
        (client.email && client.email.toLowerCase().includes(searchLower)) ||
        (client.cpf && client.cpf.includes(searchLower));

      // 2. Debt Filter (Crediário)
      const matchesDebt = filterDebt === 'positive'
        ? (client.saldo_devedor_crediario || 0) > 0
        : true;

      // 3. Balance Filter (Vale Presente)
      const matchesBalance = filterBalance === 'positive' 
        ? (client.saldo_vale_presente || 0) > 0 
        : true;

      // 4. Provador Filter
      let matchesProvador = true;
      if (filterProvador === 'true') matchesProvador = client.pode_provador || false;
      else if (filterProvador === 'false') matchesProvador = !client.pode_provador;
      else if (filterProvador === 'pending') matchesProvador = (client.itens_pendentes_provador || 0) > 0;

      // 5. WhatsApp Filter
      const matchesWhats = filterWhatsApp !== 'all'
        ? (filterWhatsApp === 'true' ? client.is_whatsapp : !client.is_whatsapp)
        : true;

      // 6. Offers Filter
      const matchesOffers = filterOffers !== 'all'
        ? (filterOffers === 'true' ? client.receber_ofertas : !client.receber_ofertas)
        : true;

      return matchesSearch && matchesDebt && matchesBalance && matchesProvador && matchesWhats && matchesOffers;
    });

    // --- SORTING LOGIC ---
    if (filterDebt === 'positive') {
      result.sort((a, b) => (b.saldo_devedor_crediario || 0) - (a.saldo_devedor_crediario || 0));
    } else if (filterBalance === 'positive') {
      result.sort((a, b) => (b.saldo_vale_presente || 0) - (a.saldo_vale_presente || 0));
    } else if (filterProvador === 'pending') {
      result.sort((a, b) => (b.itens_pendentes_provador || 0) - (a.itens_pendentes_provador || 0));
    }

    return result;
  }, [clients, searchTerm, filterDebt, filterBalance, filterProvador, filterWhatsApp, filterOffers]);

  // Pagination Calculations
  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  const formatAddress = (client: Client) => {
    if (!client.endereco) return '-';
    const { logradouro, numero, bairro, cidade, estado } = client.endereco;
    if (!logradouro) return '-';
    return `${logradouro}, ${numero} - ${bairro}, ${cidade}/${estado}`;
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleEdit = (client: Client) => {
    setClientToEdit(client);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setClientToEdit(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
           <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Clientes Cadastrados</h2>
           <p className="text-zinc-500 dark:text-zinc-400">Gerencie sua base de contatos</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2 w-full sm:w-auto">
          <UserPlus size={18} /> Cadastrar Cliente
        </Button>
      </div>

      <Card className="overflow-hidden">
        {/* Toolbar de Filtros */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-4">
           <div className="flex flex-col xl:flex-row gap-3 w-full justify-between items-start xl:items-center">
             
             {/* Search Bar */}
             <div className="relative w-full xl:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Nome, Email ou CPF..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none transition-all"
                />
              </div>

              {/* Grupos de Filtros */}
              <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                 
                 {/* 1. Crediário (Vermelho) */}
                 <div className="relative min-w-[130px]">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-red-200 dark:border-red-900/30 rounded-lg bg-red-50 dark:bg-red-900/10 text-xs font-bold text-red-700 dark:text-red-400 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer transition-colors"
                     value={filterDebt}
                     onChange={(e) => { setFilterDebt(e.target.value); if(e.target.value === 'positive') setFilterBalance('all'); }}
                   >
                     <option value="all" className="bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-normal">Dívida: Todos</option>
                     <option value="positive" className="bg-white dark:bg-zinc-900 text-red-700 dark:text-red-400 font-bold">Com Crediário</option>
                   </select>
                   <BookOpen size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none" />
                 </div>

                 {/* 2. Vale Presente (Âmbar) */}
                 <div className="relative min-w-[130px]">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-amber-200 dark:border-amber-900/30 rounded-lg bg-amber-50 dark:bg-amber-900/10 text-xs font-bold text-amber-700 dark:text-amber-400 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer transition-colors"
                     value={filterBalance}
                     onChange={(e) => { setFilterBalance(e.target.value); if(e.target.value === 'positive') setFilterDebt('all'); }}
                   >
                     <option value="all" className="bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-normal">Saldo: Todos</option>
                     <option value="positive" className="bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 font-bold">Com Saldo Vale</option>
                   </select>
                   <Gift size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
                 </div>

                 {/* 3. Provador (Roxo) */}
                 <div className="relative min-w-[130px]">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-purple-200 dark:border-purple-900/30 rounded-lg bg-purple-50 dark:bg-purple-900/10 text-xs font-bold text-purple-700 dark:text-purple-400 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer transition-colors"
                     value={filterProvador}
                     onChange={(e) => setFilterProvador(e.target.value)}
                   >
                     <option value="all" className="bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-normal">Provador: Todos</option>
                     <option value="pending" className="bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-400 font-bold">Possui Pendências</option>
                     <option value="true" className="bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-400 font-bold">Autorizado</option>
                     <option value="false" className="bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-normal">Bloqueado</option>
                   </select>
                   <Shirt size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
                 </div>

                 {/* 4. WhatsApp (Esmeralda) */}
                 <div className="relative min-w-[130px]">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-emerald-200 dark:border-emerald-900/30 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer transition-colors"
                     value={filterWhatsApp}
                     onChange={(e) => setFilterWhatsApp(e.target.value)}
                   >
                     <option value="all" className="bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-normal">WhatsApp: Todos</option>
                     <option value="true" className="bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 font-bold">Com WhatsApp</option>
                     <option value="false" className="bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-normal">Sem WhatsApp</option>
                   </select>
                   <Smartphone size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                 </div>

                 {/* 5. Ofertas (Azul) */}
                 <div className="relative min-w-[130px]">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-blue-200 dark:border-blue-900/30 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-xs font-bold text-blue-700 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer transition-colors"
                     value={filterOffers}
                     onChange={(e) => setFilterOffers(e.target.value)}
                   >
                     <option value="all" className="bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-normal">Ofertas: Todas</option>
                     <option value="true" className="bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-400 font-bold">Aceita</option>
                     <option value="false" className="bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-normal">Não Aceita</option>
                   </select>
                   <Megaphone size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                 </div>
              </div>
           </div>
        </div>

        {/* MOBILE VIEW: Card List */}
        <div className="flex flex-col gap-3 sm:hidden p-4 bg-zinc-50 dark:bg-zinc-950/50">
          {currentClients.map((client) => {
            const address = formatAddress(client);
            const pendingQty = client.itens_pendentes_provador || 0;
            return (
              <div 
                key={client.id}
                onClick={() => handleHistorySelect(client.id)}
                className="text-left p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm active:scale-[0.98] transition-all flex flex-col gap-3 cursor-pointer relative"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                     <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center relative shrink-0">
                        <User size={18} />
                     </div>
                     <div className="min-w-0">
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base truncate leading-tight">
                          {client.nome}
                        </h3>
                        {client.cpf && <span className="text-[10px] text-zinc-400 font-mono">{client.cpf}</span>}
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                     {client.receber_ofertas && <Badge variant="info" className="text-[8px] h-4 border-0">Ofertas</Badge>}
                     {pendingQty > 0 ? (
                        <Badge variant="purple" className="text-[8px] h-4 border-0">Em Provador ({pendingQty})</Badge>
                     ) : client.pode_provador && (
                        <Badge variant="purple" className="text-[8px] h-4 border-0">Provador</Badge>
                     )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 border-y border-zinc-50 dark:border-zinc-800/50 py-2">
                   <div className="flex items-center gap-2">
                      <Smartphone size={12} className="text-zinc-400" />
                      <span>{client.celular || client.telefone_fixo || 'Sem telefone'}</span>
                      {client.is_whatsapp && <Badge variant="success" className="text-[8px] h-3 px-1">Whats</Badge>}
                   </div>
                   {client.email && (
                     <div className="flex items-center gap-2">
                        <Mail size={12} className="text-zinc-400" />
                        <span className="truncate">{client.email}</span>
                     </div>
                   )}
                </div>

                <div className="flex justify-between items-end">
                   <div className="flex flex-col gap-1 min-w-0 flex-1 pr-4">
                      <div className="flex flex-wrap gap-2 mb-1">
                        {client.saldo_devedor_crediario && client.saldo_devedor_crediario > 0 ? (
                          <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold">
                            <BookOpen size={14} />
                            <span className="text-xs">{formatCurrency(client.saldo_devedor_crediario)}</span>
                          </div>
                        ) : null}
                        {client.saldo_vale_presente && client.saldo_vale_presente > 0 ? (
                          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                            <Gift size={14} />
                            <span className="text-xs">{formatCurrency(client.saldo_vale_presente)}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-start gap-1.5">
                         <MapPin size={12} className="text-zinc-400 mt-0.5 shrink-0" />
                         <span className="text-[10px] text-zinc-400 line-clamp-1">{address}</span>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-2 shrink-0">
                     <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-10 w-10 p-0 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleEdit(client); }}
                        title="Editar Dados do Cliente"
                      >
                        <Pencil size={18} />
                      </Button>
                      <ChevronRight size={20} className="text-zinc-300 ml-1" />
                   </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP VIEW: Standard Table */}
        <div className="hidden sm:block overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Nome / CPF</th>
                  <th className="px-6 py-4 font-medium">Contato</th>
                  <th className="px-6 py-4 font-medium">Crediário</th>
                  <th className="px-6 py-4 font-medium">Vale Presente</th>
                  <th className="px-6 py-4 font-medium text-center">Provador</th>
                  <th className="px-6 py-4 font-medium">Localização</th>
                  <th className="px-6 py-4 font-medium text-center">Editar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {currentClients.map((client) => {
                  const pendingQty = client.itens_pendentes_provador || 0;
                  return (
                    <tr 
                      key={client.id} 
                      onClick={() => handleHistorySelect(client.id)}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                      title="Clique para ver o histórico de compras"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center relative shrink-0">
                            <User size={20} />
                            
                            {/* Ícone: Aceita Ofertas */}
                            {client.receber_ofertas && (
                              <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm" title="Aceita Ofertas">
                                <Megaphone size={10} />
                              </div>
                            )}
                            
                            {/* Ícone: Pode Provador */}
                            {client.pode_provador && (
                              <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm" title="Permitido Provador">
                                <Shirt size={10} />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-zinc-900 dark:text-white block text-base">{client.nome}</span>
                            {client.cpf && (
                              <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500 font-mono mt-0.5">
                                <CreditCard size={12} /> {client.cpf}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                        <div className="flex flex-col gap-1">
                          {client.email && (
                              <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500">
                                <Mail size={12} /> {client.email}
                              </div>
                          )}
                          {client.celular ? (
                            <div className="flex items-center gap-2 text-xs">
                              <Smartphone size={14} className="text-zinc-400" />
                              <span>{client.celular}</span>
                              {client.is_whatsapp && (
                                <Badge variant="success" className="px-1 py-0 text-[9px] h-4">Whats</Badge>
                              )}
                            </div>
                          ) : client.telefone_fixo ? (
                            <div className="flex items-center gap-2 text-xs">
                              <Phone size={14} className="text-zinc-400" />
                              <span>{client.telefone_fixo}</span>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            {client.saldo_devedor_crediario && client.saldo_devedor_crediario > 0 ? (
                                <Badge variant="destructive" className="font-bold border-0">
                                   <BookOpen size={12} className="mr-1" />
                                   {formatCurrency(client.saldo_devedor_crediario)}
                                </Badge>
                            ) : (
                                <span className="text-zinc-400 text-xs">-</span>
                            )}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            {client.saldo_vale_presente && client.saldo_vale_presente > 0 ? (
                                <Badge variant="warning" className="font-bold border-0">
                                   <Gift size={12} className="mr-1" />
                                   {formatCurrency(client.saldo_vale_presente)}
                                </Badge>
                            ) : (
                                <span className="text-zinc-400 text-xs">-</span>
                            )}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         {pendingQty > 0 ? (
                            <div className="inline-flex flex-col items-center gap-1">
                               <Badge variant="purple" className="font-bold px-3 py-1 animate-pulse border-0">
                                  <Shirt size={14} className="mr-1.5" /> {pendingQty} peças
                               </Badge>
                               <span className="text-[9px] text-purple-600 dark:text-purple-400 uppercase font-bold">Na Rua</span>
                            </div>
                         ) : (
                            <span className="text-zinc-300 dark:text-zinc-700">-</span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-start gap-2 max-w-[200px]">
                            <MapPin size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                            <span className="text-xs truncate leading-tight" title={formatAddress(client)}>{formatAddress(client)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                           <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-10 w-10 p-0 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleEdit(client); }}
                              title="Editar Dados do Cliente"
                            >
                              <Pencil size={18} />
                            </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {currentClients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                      Nenhum cliente encontrado com os filtros atuais.
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

      <ClientFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refreshData}
        clientToEdit={clientToEdit}
      />
    </div>
  );
};