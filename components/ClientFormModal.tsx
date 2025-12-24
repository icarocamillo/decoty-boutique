
import React, { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, User, Mail, Phone, Loader2, MapPin, Smartphone, Megaphone, Check, CreditCard, Shirt, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { mockService } from '../services/mockService';
import { Client } from '../types';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientToEdit?: Client | null;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({ isOpen, onClose, onSuccess, clientToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  
  // State for Form Data
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone_fixo: '',
    celular: '',
    is_whatsapp: false,
    receber_ofertas: false,
    pode_provador: false,
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: ''
  });

  // Carrega lista de clientes para validação de duplicidade
  useEffect(() => {
    if (isOpen) {
      mockService.getClients().then(setAllClients);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        setFormData({
          nome: clientToEdit.nome,
          cpf: clientToEdit.cpf || '',
          email: clientToEdit.email,
          telefone_fixo: clientToEdit.telefone_fixo || '',
          celular: clientToEdit.celular || '',
          is_whatsapp: clientToEdit.is_whatsapp || false,
          receber_ofertas: clientToEdit.receber_ofertas || false,
          pode_provador: clientToEdit.pode_provador || false,
          cep: clientToEdit.endereco?.cep || '',
          logradouro: clientToEdit.endereco?.logradouro || '',
          numero: clientToEdit.endereco?.numero || '',
          complemento: clientToEdit.endereco?.complemento || '',
          bairro: clientToEdit.endereco?.bairro || '',
          cidade: clientToEdit.endereco?.cidade || '',
          estado: clientToEdit.endereco?.estado || ''
        });
      } else {
        setFormData({
          nome: '', cpf: '', email: '', telefone_fixo: '', celular: '', is_whatsapp: false, receber_ofertas: false, pode_provador: false,
          cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''
        });
      }
    }
  }, [isOpen, clientToEdit]);

  // Validação de CPF Duplicado
  const isCpfDuplicate = useMemo(() => {
    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf.length < 11) return false;
    
    return allClients.some(c => {
      const existingCpf = (c.cpf || '').replace(/\D/g, '');
      // Se estiver editando, não considerar o próprio cliente como duplicata
      if (clientToEdit && c.id === clientToEdit.id) return false;
      return existingCpf === cleanCpf;
    });
  }, [formData.cpf, allClients, clientToEdit]);

  const canReceiveOffers = !!formData.email || (!!formData.celular && formData.is_whatsapp);

  useEffect(() => {
    if (!canReceiveOffers && formData.receber_ofertas) {
      setFormData(prev => ({ ...prev, receber_ofertas: false }));
    }
  }, [canReceiveOffers, formData.receber_ofertas]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 9) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
    } else if (value.length > 6) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
    } else if (value.length > 3) {
      value = `${value.slice(0, 3)}.${value.slice(3)}`;
    }

    setFormData(prev => ({ ...prev, cpf: value }));
  };

  const handleFixoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 10) value = value.slice(0, 10);
    if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    if (value.length > 9) value = `${value.slice(0, 9)}-${value.slice(9)}`;
    setFormData(prev => ({ ...prev, telefone_fixo: value }));
  };

  const handleCelularChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    let formatted = value;
    if (value.length > 2) formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    if (value.length > 3) formatted = `(${value.slice(0, 2)}) ${value.slice(2, 3)} ${value.slice(3)}`;
    if (value.length > 7) formatted = `(${value.slice(0, 2)}) ${value.slice(2, 3)} ${value.slice(3, 7)}-${value.slice(7)}`;
    setFormData(prev => ({ ...prev, celular: formatted }));
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5)}`;
    setFormData(prev => ({ ...prev, cep: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCpfDuplicate) return;
    if (!formData.nome || (!formData.celular && !formData.telefone_fixo)) {
       alert("Por favor, preencha o nome e ao menos um telefone de contato.");
       return;
    }

    setLoading(true);
    
    const payload = {
      nome: formData.nome,
      cpf: formData.cpf,
      email: formData.email,
      telefone_fixo: formData.telefone_fixo,
      celular: formData.celular,
      is_whatsapp: formData.is_whatsapp,
      receber_ofertas: formData.receber_ofertas,
      pode_provador: formData.pode_provador,
      telefone: formData.celular || formData.telefone_fixo,
      endereco: {
        cep: formData.cep,
        logradouro: formData.logradouro,
        numero: formData.numero,
        complemento: formData.complemento,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado
      }
    };

    try {
      let success = false;
      if (clientToEdit) {
        success = await mockService.updateClient({
          ...payload,
          id: clientToEdit.id,
          data_cadastro: clientToEdit.data_cadastro
        });
      } else {
        success = await mockService.createClient(payload);
      }
      
      if (success) {
        onSuccess();
        onClose();
      } else {
         alert(`Erro ao ${clientToEdit ? 'editar' : 'cadastrar'} cliente`);
      }
    } catch (error: any) {
        alert(error.message || "Erro ao salvar cliente");
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up border border-zinc-200 dark:border-zinc-800">
        
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="text-zinc-700 dark:text-zinc-300" size={20} />
            <h2 className="text-lg font-bold text-zinc-800 dark:text-white">
              {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 min-h-0 bg-white dark:bg-zinc-900">
          <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2 mb-2">
                <User size={14} /> Dados Pessoais
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome Completo <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="nome"
                    required
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="Ex: Maria Silva"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                     <CreditCard size={16} className="text-zinc-400" /> CPF
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleCpfChange}
                      placeholder="000.000.000-00"
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:outline-none font-mono transition-all ${
                        isCpfDuplicate 
                          ? 'border-red-500 ring-2 ring-red-500/20' 
                          : 'border-zinc-300 dark:border-zinc-700 focus:ring-zinc-500'
                      }`}
                    />
                    {isCpfDuplicate && (
                      <div className="flex items-center gap-1 mt-1 text-red-500 animate-fade-in">
                        <AlertCircle size={12} />
                        <span className="text-[11px] font-bold">Este CPF já pertence a outro cliente cadastrado.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <Mail size={16} className="text-zinc-400" /> Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Ex: maria@email.com"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                    />
                  </div>
                 <div className="hidden md:block"></div>
               </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <Phone size={16} className="text-zinc-400" /> Telefone Fixo
                    </label>
                    <input
                      type="tel"
                      name="telefone_fixo"
                      value={formData.telefone_fixo}
                      onChange={handleFixoChange}
                      placeholder="(00) 0000-0000"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                      <span className="flex items-center gap-2"><Smartphone size={16} className="text-zinc-400" /> Celular</span>
                      <label className="flex items-center gap-1 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          name="is_whatsapp"
                          checked={formData.is_whatsapp}
                          onChange={handleChange}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 bg-transparent"
                        />
                        <span className="text-xs text-green-600 dark:text-green-400 font-semibold group-hover:text-green-700 transition-colors">É WhatsApp?</span>
                      </label>
                    </label>
                    <input
                      type="tel"
                      name="celular"
                      value={formData.celular}
                      onChange={handleCelularChange}
                      placeholder="(00) 0 0000-0000"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none font-mono"
                    />
                  </div>
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800" />

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2 mb-2">
                <MapPin size={14} /> Endereço
              </h3>
              
              <div className="grid grid-cols-12 gap-4">
                 <div className="col-span-12 sm:col-span-3 space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">CEP</label>
                    <input
                      type="text"
                      name="cep"
                      value={formData.cep}
                      onChange={handleCepChange}
                      placeholder="00000-000"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                    />
                 </div>
                 <div className="col-span-12 sm:col-span-6 space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Rua / Logradouro</label>
                    <input
                      type="text"
                      name="logradouro"
                      value={formData.logradouro}
                      onChange={handleChange}
                      placeholder="Ex: Av. Paulista"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                    />
                 </div>
                 <div className="col-span-12 sm:col-span-3 space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Número</label>
                    <input
                      type="text"
                      name="numero"
                      value={formData.numero}
                      onChange={handleChange}
                      placeholder="123"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Complemento</label>
                    <input
                      type="text"
                      name="complemento"
                      value={formData.complemento}
                      onChange={handleChange}
                      placeholder="Ex: Apto 402, Bloco B"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Bairro</label>
                    <input
                      type="text"
                      name="bairro"
                      value={formData.bairro}
                      onChange={handleChange}
                      placeholder="Ex: Centro"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                 <div className="col-span-12 sm:col-span-9 space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Cidade</label>
                    <input
                      type="text"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleChange}
                      placeholder="Ex: São Paulo"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                    />
                 </div>
                 <div className="col-span-12 sm:col-span-3 space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">UF</label>
                    <select
                      name="estado"
                      value={formData.estado}
                      onChange={(e) => handleChange(e as any)}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                    >
                      <option value="">UF</option>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                 </div>
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800" />

             <div className="space-y-4">
               <div className="grid grid-cols-1 gap-3">
                 <label className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                   canReceiveOffers 
                     ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800' 
                     : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 cursor-not-allowed opacity-60'
                 }`}>
                    <input 
                      type="checkbox" 
                      name="receber_ofertas"
                      checked={formData.receber_ofertas}
                      onChange={handleChange}
                      disabled={!canReceiveOffers}
                      className="mt-1 w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:text-zinc-400 bg-transparent"
                    />
                    <div>
                      <span className={`block text-sm font-medium flex items-center gap-2 ${canReceiveOffers ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
                         <Megaphone size={16} /> Quero receber ofertas da loja
                      </span>
                      <span className={`block text-xs ${canReceiveOffers ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-600'}`}>
                        {canReceiveOffers 
                          ? 'O cliente aceita receber promoções via WhatsApp ou E-mail.' 
                          : 'Necessário informar um Email ou WhatsApp válido para habilitar esta opção.'}
                      </span>
                    </div>
                 </label>

                 <label className="flex items-start gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-pointer bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <input 
                      type="checkbox" 
                      name="pode_provador"
                      checked={formData.pode_provador}
                      onChange={handleChange}
                      className="mt-1 w-4 h-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500 bg-transparent"
                    />
                    <div>
                      <span className="block text-sm font-medium flex items-center gap-2 text-zinc-900 dark:text-white">
                         <Shirt size={16} className="text-purple-600" /> Permitir levar peças para Provador
                      </span>
                      <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                        Habilita a retirada de peças do estoque em nome deste cliente para provar em casa.
                      </span>
                    </div>
                 </label>
               </div>
             </div>

          </form>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            form="client-form" 
            disabled={loading || isCpfDuplicate} 
            className={`w-32 flex items-center justify-center gap-2 ${isCpfDuplicate ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (
              clientToEdit ? <><Check size={18} /> Salvar</> : 'Cadastrar'
            )}
          </Button>
        </div>

      </div>
    </div>
  );
};
