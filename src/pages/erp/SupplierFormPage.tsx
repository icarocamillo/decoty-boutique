import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Truck, ArrowLeft, Save, Loader2, Building, Tag, ShoppingBag, User, Phone, Mail, MapPin, Globe, StickyNote, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { backendService } from '@/services/backendService';
import { Supplier } from '@/types';
import { useData } from '@/contexts/DataContext';

const SUPPLIER_TYPES = ['Roupas', 'Acessórios', 'Roupas e Acessórios'];

export const SupplierFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { suppliers, refreshData } = useData();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    nome_empresa: '',
    fantasy_name: '',
    nome_contato: '',
    cnpj_cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    observacoes: '',
    tipo_fornecedor: '' as any,
    catalogo: '',
    show_on_site: false,
    stars: 0
  });

  const supplierToEdit = useMemo(() => {
    if (!id) return null;
    const numericId = parseInt(id, 10);
    return suppliers.find(s => s.id === id || s.ui_id === numericId) || null;
  }, [id, suppliers]);

  useEffect(() => {
    if (id && supplierToEdit) {
      if (supplierToEdit.ui_id && id !== supplierToEdit.ui_id.toString()) {
        navigate(`/erp/suppliers/update/${supplierToEdit.ui_id}`, { replace: true });
      }
    }
  }, [id, supplierToEdit, navigate]);

  useEffect(() => {
    if (id) {
      if (supplierToEdit) {
        setFormData({
          nome_empresa: supplierToEdit.nome_empresa,
          fantasy_name: supplierToEdit.fantasy_name || '',
          nome_contato: supplierToEdit.nome_contato || '',
          cnpj_cpf: supplierToEdit.cnpj_cpf || '',
          email: supplierToEdit.email || '',
          telefone: supplierToEdit.telefone || '',
          endereco: supplierToEdit.endereco || '',
          observacoes: supplierToEdit.observacoes || '',
          tipo_fornecedor: supplierToEdit.tipo_fornecedor || '',
          catalogo: supplierToEdit.catalogo || '',
          show_on_site: supplierToEdit.show_on_site || false,
          stars: supplierToEdit.stars || 0
        });
        setFetching(false);
      } else {
        // If suppliers are still loading or not populated yet, wait
        if (suppliers.length > 0) {
          setFetching(false);
        }
      }
    } else {
      setFetching(false);
    }
  }, [id, supplierToEdit, suppliers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
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
       setErrors(prev => ({ ...prev, nome_empresa: true }));
       alert("Por favor, preencha o nome da empresa.");
       return;
    }
    if (!formData.tipo_fornecedor) {
       setErrors(prev => ({ ...prev, tipo_fornecedor: true }));
       alert("Por favor, selecione o tipo de fornecedor.");
       return;
    }

    setLoading(true);
    
    try {
      let success = false;
      const supplierId = supplierToEdit?.id || '';
      
      const payload: Supplier = {
        id: supplierId,
        nome_empresa: formData.nome_empresa,
        fantasy_name: formData.fantasy_name || undefined,
        nome_contato: formData.nome_contato || undefined,
        cnpj_cpf: formData.cnpj_cpf || undefined,
        email: formData.email || undefined,
        telefone: formData.telefone || undefined,
        endereco: formData.endereco || undefined,
        observacoes: formData.observacoes || undefined,
        tipo_fornecedor: formData.tipo_fornecedor || undefined,
        catalogo: formData.catalogo || undefined,
        show_on_site: formData.show_on_site,
        stars: formData.stars
      };

      if (supplierToEdit) {
        success = await backendService.updateSupplier(payload);
      } else {
        const { id: _, ...newPayload } = payload;
        success = await backendService.createSupplier(newPayload);
      }
      
      if (success) {
        await refreshData();
        navigate('/erp/suppliers');
      } else {
         alert(`Erro ao ${id ? 'editar' : 'cadastrar'} fornecedor`);
      }
    } catch (error: any) {
        alert(error.message);
    } finally {
        setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-zinc-500" size={32} />
        <span className="text-zinc-500 text-sm font-medium">Carregando dados do fornecedor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
          <div className="flex items-center gap-4">
            <button 
              type="button" 
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-zinc-550 dark:text-zinc-400 transition-colors"
              onClick={() => navigate('/erp/suppliers')}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                {id ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {id ? 'Altere as informações correspondentes deste parceiro' : 'Preencha os campos para cadastrar um novo fornecedor comercial'}
              </p>
            </div>
          </div>

          {/* Quick action in header */}
          <div className="flex items-center gap-3">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => navigate('/erp/suppliers')} 
              disabled={loading}
              className="px-5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900"
            >
              Voltar para Listagem
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="px-6 flex items-center justify-center gap-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Salvando Fornecedor...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvar Fornecedor
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna Principal (Esquerda - 2/3) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card 1: Identificação da Empresa */}
            <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-6">
                <Building className="text-zinc-400" size={18} />
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">Identificação da Empresa</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    Razão Social / Nome da Empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nome_empresa"
                    required
                    value={formData.nome_empresa}
                    onChange={handleChange}
                    placeholder="Ex: Confecções Silva Ltda"
                    className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-400 focus:outline-none transition-colors ${errors.nome_empresa ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-300 dark:border-zinc-700'}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <Tag size={16} className="text-zinc-400" /> Nome Fantasia (Marca)
                  </label>
                  <input
                    type="text"
                    name="fantasy_name"
                    value={formData.fantasy_name}
                    onChange={handleChange}
                    placeholder="Ex: Monclos"
                    className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-400 focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Usado para selecionar a marca no cadastro de produtos.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <ShoppingBag size={16} className="text-zinc-400" /> Tipo de Fornecedor <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="tipo_fornecedor"
                    required
                    value={formData.tipo_fornecedor}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-400 focus:outline-none transition-colors ${errors.tipo_fornecedor ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-300 dark:border-zinc-700'}`}
                  >
                    <option value="" disabled>Selecione uma opção...</option>
                    {SUPPLIER_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">CNPJ / CPF</label>
                  <input
                    type="text"
                    name="cnpj_cpf"
                    value={formData.cnpj_cpf}
                    onChange={handleCnpjCpfChange}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-400 focus:outline-none font-mono transition-colors"
                  />
                </div>

              </div>
            </Card>

            {/* Card 2: Endereço & Observações */}
            <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-6">
                <MapPin className="text-zinc-400" size={18} />
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">Localização & Informações Extras</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Endereço Completo</label>
                  <input
                    type="text"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleChange}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-400 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <StickyNote size={16} className="text-zinc-400" /> Observações Internas
                  </label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Informações contratuais, prazos de entrega específicos, acordos comerciais..."
                    className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-400 focus:outline-none resize-none transition-colors"
                  />
                </div>
              </div>
            </Card>

          </div>

          {/* Coluna Lateral (Direita - 1/3) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Card 3: Contatos & Canais */}
            <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-6">
                <Phone className="text-zinc-400" size={18} />
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">Canais de Contato</h3>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <User size={15} className="text-zinc-400" /> Nome do Contato
                  </label>
                  <input
                    type="text"
                    name="nome_contato"
                    value={formData.nome_contato}
                    onChange={handleChange}
                    placeholder="Nome do representante/contato"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-400 focus:outline-none transition-colors text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <Phone size={15} className="text-zinc-400" /> Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-400 focus:outline-none font-mono transition-colors text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <Mail size={15} className="text-zinc-400" /> Email Comercial
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="contato@empresa.com"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-400 focus:outline-none transition-colors text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <Globe size={15} className="text-zinc-400" /> Catálogo / Link Externo
                  </label>
                  <input
                    type="text"
                    name="catalogo"
                    value={formData.catalogo}
                    onChange={handleChange}
                    placeholder="Ex: Link Drive, Instagram ou Site"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-400 focus:outline-none transition-colors text-sm"
                  />
                </div>
              </div>
            </Card>

            {/* Card 4: Status no Site & Qualidade */}
            <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-6">
                <Star className="text-zinc-400" size={18} />
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">Ajustes & Qualificação</h3>
              </div>

              <div className="space-y-6">
                {/* Toggle Show On Site */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide block">Mostrar Marca no Site</label>
                  <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, show_on_site: true }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.show_on_site ? 'bg-emerald-550 text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                    >
                      ATIVAR
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, show_on_site: false }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${!formData.show_on_site ? 'bg-red-500 text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                    >
                      DESATIVAR
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Se ativado, esta marca/fornecedor fica publicamente visível no menu de filtros do catálogo de vendas.
                  </p>
                </div>

                {/* Stars Rating */}
                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide block">Qualificação do Parceiro</label>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1.5 rounded-lg">
                      {[1, 2, 3, 4, 5].map((starValue) => {
                        const diff = formData.stars - (starValue - 1);
                        const fillPercentage = Math.min(Math.max(diff * 100, 0), 100);

                        return (
                          <button
                            type="button"
                            key={starValue}
                            onClick={() => setFormData(prev => ({ ...prev, stars: starValue }))}
                            className="relative inline-block hover:scale-110 transition-transform p-0.5 focus:outline-none"
                            style={{ width: 22, height: 22 }}
                            title={`Qualificar como ${starValue} estrela(s)`}
                          >
                            <Star 
                              size={18} 
                              className="text-zinc-300 dark:text-zinc-600 absolute top-0.5 left-0.5" 
                            />
                            {fillPercentage > 0 && (
                              <div
                                className="absolute top-0.5 left-0.5 overflow-hidden"
                                style={{ width: `${fillPercentage}%`, height: 18 }}
                              >
                                <Star 
                                  size={18} 
                                  className="fill-amber-400 text-amber-400 absolute top-0 left-0" 
                                  style={{ width: 18, minWidth: 18, maxWidth: 18 }}
                                />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={formData.stars || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setFormData(prev => ({ 
                            ...prev, 
                            stars: isNaN(val) ? 0 : Math.min(Math.max(val, 0), 5) 
                          }));
                        }}
                        className="w-16 px-2 py-1 text-xs font-bold text-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        placeholder="Nota"
                      />
                      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 font-mono text-[10px]">
                        / 5
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Nota interna (qualidade do produto, atendimento e pontualidade na entrega).
                  </p>
                </div>
              </div>
            </Card>

          </div>

        </div>
      </form>
    </div>
  );
};
