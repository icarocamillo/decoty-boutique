
import React, { useState, useEffect } from 'react';
import { X, Truck, User, Mail, Phone, Loader2, MapPin, Building, Check, StickyNote, Tag } from 'lucide-react';
import { Button } from './ui/Button';
import { backendService } from '../services/backendService';
import { Supplier } from '../types';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplierToEdit?: Supplier | null;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({ isOpen, onClose, onSuccess, supplierToEdit }) => {
  const [loading, setLoading] = useState(false);
  
  // State for Form Data
  const [formData, setFormData] = useState({
    nome_empresa: '',
    fantasy_name: '',
    nome_contato: '',
    cnpj_cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    observacoes: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (supplierToEdit) {
        setFormData({
          nome_empresa: supplierToEdit.nome_empresa,
          fantasy_name: supplierToEdit.fantasy_name || '',
          nome_contato: supplierToEdit.nome_contato || '',
          cnpj_cpf: supplierToEdit.cnpj_cpf || '',
          email: supplierToEdit.email || '',
          telefone: supplierToEdit.telefone || '',
          endereco: supplierToEdit.endereco || '',
          observacoes: supplierToEdit.observacoes || ''
        });
      } else {
        setFormData({
          nome_empresa: '',
          fantasy_name: '',
          nome_contato: '',
          cnpj_cpf: '',
          email: '',
          telefone: '',
          endereco: '',
          observacoes: ''
        });
      }
    }
  }, [isOpen, supplierToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCnpjCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 14) value = value.slice(0, 14);
    
    // Máscara CNPJ (14) ou CPF (11)
    if (value.length > 11) {
        value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    } else if (value.length > 9) {
        value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }

    setFormData(prev => ({ ...prev, cnpj_cpf: value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    // Formata (XX) X XXXX-XXXX ou (XX) XXXX-XXXX
    let formatted = value;
    if (value.length > 2) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 7) {
        if (value.length === 11) {
            formatted = `(${value.slice(0, 2)}) ${value.slice(2, 3)} ${value.slice(3, 7)}-${value.slice(7)}`;
        } else {
            formatted = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
        }
    }

    setFormData(prev => ({ ...prev, telefone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_empresa) {
       alert("Por favor, preencha o nome da empresa.");
       return;
    }

    setLoading(true);
    
    try {
      let success = false;
      
      if (supplierToEdit) {
        success = await backendService.updateSupplier({
          ...formData,
          id: supplierToEdit.id
        });
      } else {
        success = await backendService.createSupplier(formData);
      }
      
      if (success) {
        onSuccess();
        onClose();
      } else {
         alert(`Erro ao ${supplierToEdit ? 'editar' : 'cadastrar'} fornecedor`);
      }
    } catch (error: any) {
        alert(error.message);
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up border border-zinc-200 dark:border-zinc-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <Truck className="text-zinc-700 dark:text-zinc-300" size={20} />
            <h2 className="text-lg font-bold text-zinc-800 dark:text-white">
              {supplierToEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="supplier-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                     <Building size={16} className="text-zinc-400" /> Razão Social / Empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nome_empresa"
                    required
                    value={formData.nome_empresa}
                    onChange={handleChange}
                    placeholder="Ex: Confecções Silva Ltda"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                     <Tag size={16} className="text-zinc-400" /> Nome Fantasia (Marca)
                  </label>
                  <input
                    type="text"
                    name="fantasy_name"
                    value={formData.fantasy_name}
                    onChange={handleChange}
                    placeholder="Ex: Monclos"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-500">Usado para selecionar a marca no cadastro de produtos.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">CNPJ / CPF</label>
                  <input
                    type="text"
                    name="cnpj_cpf"
                    value={formData.cnpj_cpf}
                    onChange={handleCnpjCpfChange}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                       <User size={16} className="text-zinc-400" /> Nome do Contato
                    </label>
                    <input
                      type="text"
                      name="nome_contato"
                      value={formData.nome_contato}
                      onChange={handleChange}
                      placeholder="Ex: João Representante"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <Phone size={16} className="text-zinc-400" /> Telefone / Celular
                    </label>
                    <input
                      type="tel"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handlePhoneChange}
                      placeholder="(00) 00000-0000"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none font-mono"
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <Mail size={16} className="text-zinc-400" /> Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="contato@empresa.com"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <MapPin size={16} className="text-zinc-400" /> Endereço Completo
                  </label>
                  <input
                    type="text"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleChange}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <StickyNote size={16} className="text-zinc-400" /> Observações
                  </label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Informações adicionais..."
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none resize-none"
                  />
               </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="supplier-form" disabled={loading} className="w-32 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : (
              supplierToEdit ? <><Check size={18} /> Salvar</> : 'Cadastrar'
            )}
          </Button>
        </div>

      </div>
    </div>
  );
};
