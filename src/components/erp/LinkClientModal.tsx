import React, { useState, useMemo } from 'react';
import { Search, Link as LinkIcon, Loader2, X, User, Globe, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useData } from '@/contexts/DataContext';
import { backendService } from '@/services/backendService';
import { Client } from '@/types';

interface LinkClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LinkClientModal: React.FC<LinkClientModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { clients } = useData();
  const [loading, setLoading] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [siteSearch, setSiteSearch] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const storeClients = useMemo(() => {
    return clients.filter(c => c.origin === 'store_only' || !c.origin);
  }, [clients]);

  const siteClients = useMemo(() => {
    return clients.filter(c => c.origin === 'site_only' || c.origin === 'both');
  }, [clients]);

  const filteredStore = useMemo(() => {
    if (!storeSearch) return [];
    return storeClients.filter(c => 
      (c.nome || '').toLowerCase().includes(storeSearch.toLowerCase()) || 
      (c.email && c.email.toLowerCase().includes(storeSearch.toLowerCase()))
    ).slice(0, 5);
  }, [storeClients, storeSearch]);

  const filteredSite = useMemo(() => {
    if (!siteSearch) return [];
    return siteClients.filter(c => 
      (c.nome || '').toLowerCase().includes(siteSearch.toLowerCase()) || 
      (c.email && c.email.toLowerCase().includes(siteSearch.toLowerCase()))
    ).slice(0, 5);
  }, [siteClients, siteSearch]);

  const handleLink = async () => {
    if (!selectedStoreId || !selectedSiteId) return;
    
    setLoading(true);
    try {
      const success = await backendService.linkClients(selectedStoreId, selectedSiteId);
      if (success) {
        onSuccess();
        onClose();
        reset();
      } else {
        alert("Erro ao vincular clientes. Tente novamente.");
      }
    } catch (error: any) {
      alert(error.message || "Erro desconhecido ao vincular");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStoreSearch('');
    setSiteSearch('');
    setSelectedStoreId(null);
    setSelectedSiteId(null);
  };

  if (!isOpen) return null;

  const selectedStoreClient = storeClients.find(c => c.id === selectedStoreId);
  const selectedSiteClient = siteClients.find(c => c.id === selectedSiteId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-2xl bg-white dark:bg-zinc-900 shadow-2xl border-0 overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                <LinkIcon size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Vincular Cliente do Site</h2>
                <p className="text-sm text-zinc-500">Unifica o cadastro da loja física com o usuário do site</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Alerta de Explicação */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex gap-3">
             <AlertCircle className="text-blue-600 shrink-0" size={20} />
             <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Esta ação irá unificar os dois cadastros. Os saldos de <strong>Vale Presente</strong>, <strong>Crediário</strong> e <strong>Itens no Provador</strong> serão somados. 
                O acesso do site (Login) será mantido. Após a unificação, o registro da loja física será removido e apenas o do site permanecerá como "Ambos".
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* Divisor Visual no Desktop */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-zinc-100 dark:bg-zinc-800 -translate-x-1/2" />

            {/* Coluna Cliente Loja (ERP) */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                 <User size={14} /> Cliente Loja Física (ERP)
              </label>
              
              {!selectedStoreId ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Pesquisar por nome..."
                      value={storeSearch}
                      onChange={(e) => setStoreSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-zinc-500 transition-all font-medium"
                    />
                  </div>
                  
                  {filteredStore.length > 0 && (
                    <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-lg divide-y divide-zinc-50 dark:divide-zinc-700 overflow-hidden">
                      {filteredStore.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedStoreId(c.id)}
                          className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors flex flex-col"
                        >
                          <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{c.nome}</span>
                          <span className="text-[10px] text-zinc-500">{c.email || 'Sem email'} • {c.cpf || 'Sem CPF'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {storeSearch && filteredStore.length === 0 && (
                    <p className="text-[10px] text-zinc-400 text-center italic">Nenhum cliente "loja somente" encontrado</p>
                  )}
                </div>
              ) : (
                <div className="p-4 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30 relative group">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200">{selectedStoreClient?.nome}</div>
                  <div className="text-[10px] text-zinc-500">{selectedStoreClient?.email}</div>
                  <button 
                    onClick={() => setSelectedStoreId(null)}
                    className="absolute top-2 right-2 p-1 bg-zinc-200 dark:bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Coluna Cliente Site (Site Only) */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                 <Globe size={14} /> Cliente do Site
              </label>

              {!selectedSiteId ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Pesquisar por nome..."
                      value={siteSearch}
                      onChange={(e) => setSiteSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-zinc-500 transition-all font-medium"
                    />
                  </div>
                  
                  {filteredSite.length > 0 && (
                    <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-lg divide-y divide-zinc-50 dark:divide-zinc-700 overflow-hidden">
                      {filteredSite.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedSiteId(c.id)}
                          className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors flex flex-col"
                        >
                          <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{c.nome}</span>
                          <span className="text-[10px] text-zinc-500">{c.email || 'Sem email'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {siteSearch && filteredSite.length === 0 && (
                    <p className="text-[10px] text-zinc-400 text-center italic">Nenhum cliente do site encontrado</p>
                  )}
                </div>
              ) : (
                <div className="p-4 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30 relative group">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200">{selectedSiteClient?.nome}</div>
                  <div className="text-[10px] text-zinc-500">{selectedSiteClient?.email}</div>
                  <button 
                    onClick={() => setSelectedSiteId(null)}
                    className="absolute top-2 right-2 p-1 bg-zinc-200 dark:bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={loading || !selectedStoreId || !selectedSiteId}
            className="flex items-center gap-2 px-8 min-w-[200px]"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><LinkIcon size={18} /> Confirmar Vínculo</>}
          </Button>
        </div>
      </Card>
    </div>
  );
};
