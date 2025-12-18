
import React, { useState, useMemo, useEffect } from 'react';
import { Client } from '../types';
import { User, Phone, Mail, UserPlus, Smartphone, MapPin, Megaphone, Search, Filter, CreditCard, Pencil, Shirt, Gift } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ClientFormModal } from './ClientFormModal';
import { Pagination } from './ui/Pagination';
import { formatDateStandard } from '../utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ClientListProps {
  clients: Client[];
  onUpdate: () => void;
}

export const ClientList: React.FC<ClientListProps> = ({ clients, onUpdate }) => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // Filter States (Main Table)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUF, setSelectedUF] = useState('');
  const [filterWhatsApp, setFilterWhatsApp] = useState('');
  const [filterOffers, setFilterOffers] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedUF, filterWhatsApp, filterOffers, itemsPerPage]);

  const handleHistorySelect = (clientId: string) => {
    navigate(`/clients/${clientId}/history`);
  };

  // --- LOGIC: Main Table Filtering ---

  // Extract unique UFs for filter
  const uniqueUFs = useMemo(() => {
    const ufs = new Set<string>();
    clients.forEach(c => {
      if (c.endereco?.estado) ufs.add(c.endereco.estado);
    });
    return Array.from(ufs).sort();
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // 1. Text Search (Name, Email or CPF)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        client.nome.toLowerCase().includes(searchLower) || 
        (client.email && client.email.toLowerCase().includes(searchLower)) ||
        (client.cpf && client.cpf.includes(searchLower));

      // 2. UF Filter
      const matchesUF = selectedUF 
        ? client.endereco?.estado === selectedUF 
        : true;

      // 3. WhatsApp Filter
      const matchesWhats = filterWhatsApp 
        ? (filterWhatsApp === 'true' ? client.is_whatsapp : !client.is_whatsapp)
        : true;

      // 4. Offers Filter
      const matchesOffers = filterOffers
        ? (filterOffers === 'true' ? client.receber_ofertas : !client.receber_ofertas)
        : true;

      return matchesSearch && matchesUF && matchesWhats && matchesOffers;
    });
  }, [clients, searchTerm, selectedUF, filterWhatsApp, filterOffers]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Clientes Cadastrados</h2>
           <p className="text-zinc-500 dark:text-zinc-400">Gerencie sua base de contatos</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <UserPlus size={18} /> Cadastrar Cliente
        </Button>
      </div>

      <Card className="overflow-hidden">
        {/* Toolbar de Filtros */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
           <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-wrap">
             {/* Search */}
             <div className="relative w-full md:w-60">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Nome, Email ou CPF..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                 {/* UF */}
                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={selectedUF}
                     onChange={(e) => setSelectedUF(e.target.value)}
                   >
                     <option value="">Todos UFs</option>
                     {uniqueUFs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>

                 {/* WhatsApp Filter */}
                 <div className="relative w-full sm:w-36">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={filterWhatsApp}
                     onChange={(e) => setFilterWhatsApp(e.target.value)}
                   >
                     <option value="">WhatsApp: Todos</option>
                     <option value="true">Com WhatsApp</option>
                     <option value="false">Sem WhatsApp</option>
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>

                 {/* Ofertas Filter */}
                 <div className="relative w-full sm:w-36">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={filterOffers}
                     onChange={(e) => setFilterOffers(e.target.value)}
                   >
                     <option value="">Ofertas: Todos</option>
                     <option value="true">Aceita Ofertas</option>
                     <option value="false">Não Aceita</option>
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>
              </div>
           </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Nome / CPF</th>
                  <th className="px-6 py-4 font-medium">Contato</th>
                  <th className="px-6 py-4 font-medium">Saldo (Vale)</th>
                  <th className="px-6 py-4 font-medium">Localização</th>
                  <th className="px-6 py-4 font-medium text-center">Editar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {currentClients.map((client) => {
                  const { weekDay, dateTime } = formatDateStandard(client.data_cadastro);
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
                            
                            {/* Ícone: Aceita Ofertas (Canto Superior Direito) */}
                            {client.receber_ofertas && (
                              <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm" title="Aceita Ofertas">
                                <Megaphone size={10} />
                              </div>
                            )}
                            
                            {/* Ícone: Pode Provador (Canto Inferior Direito) */}
                            {client.pode_provador && (
                              <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm" title="Permitido Provador">
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
                            {client.saldo_vale_presente && client.saldo_vale_presente > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                   <Gift size={12} />
                                   {formatCurrency(client.saldo_vale_presente)}
                                </span>
                            ) : (
                                <span className="text-zinc-400 text-xs">-</span>
                            )}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-start gap-2 max-w-[200px]">
                            <MapPin size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                            <span className="text-xs truncate leading-tight" title={formatAddress(client)}>{formatAddress(client)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                           {/* Botão de Editar */}
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
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
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
        onSuccess={onUpdate}
        clientToEdit={clientToEdit}
      />
    </div>
  );
};
