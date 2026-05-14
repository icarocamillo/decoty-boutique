import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User, UserCircle, LogOut, ChevronRight, Lock, Save, Package, Heart, Phone, MapPin, Mail, CreditCard, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { backendService } from '@/services/backendService';
import { Client } from '@/types';

export const CustomerSettingsPage: React.FC = () => {
  const { user, userName, userEmail, signOut, updatePassword } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [clientData, setClientData] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    celular: '',
    telefone_fixo: '',
    receber_ofertas: true,
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: ''
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2').substring(0, 9);
  };

  const maskCPF = (cpf: string | undefined) => {
    if (!cpf) return 'Não informado';
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return cpf;
    return `${numbers.substring(0, 3)}.***.***-*${numbers.substring(10)}`;
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await backendService.getClientByUserId(user.id);
        if (data) {
          setClientData(data);
          setFormData({
            nome: data.nome || '',
            celular: data.celular || '',
            telefone_fixo: data.telefone_fixo || '',
            receber_ofertas: data.receber_ofertas ?? true,
            cep: data.endereco?.cep || '',
            logradouro: data.endereco?.logradouro || '',
            numero: data.endereco?.numero || '',
            complemento: data.endereco?.complemento || '',
            bairro: data.endereco?.bairro || '',
            cidade: data.endereco?.cidade || '',
            estado: data.endereco?.estado || ''
          });
        }
      } catch (err) {
        console.error("Erro ao carregar dados do cliente:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: any = {
      nome: formData.nome,
      celular: formData.celular,
      telefone_fixo: formData.telefone_fixo,
      receber_ofertas: formData.receber_ofertas,
      cep: formData.cep,
      logradouro: formData.logradouro,
      numero: formData.numero,
      complemento: formData.complemento,
      bairro: formData.bairro,
      cidade: formData.cidade,
      estado: formData.estado
    };

    try {
      const ok = await backendService.updateClientProfile(user.id, payload);
      if (ok) {
        setSuccess('Perfil atualizado com sucesso!');
      } else {
        setError('Ocorreu um erro ao atualizar o perfil.');
      }
    } catch (err) {
      setError('Erro de conexão ao salvar os dados.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSaving(true);
    try {
      const { error } = await updatePassword(passwordData.newPassword);
      if (error) {
        alert('Erro ao atualizar senha: ' + error.message);
      } else {
        alert('Senha alterada com sucesso!');
        setPasswordData({ newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      alert('Erro inesperado ao atualizar senha.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-zinc-50">
        <Loader2 size={32} className="animate-spin text-zinc-900" />
      </div>
    );
  }

  return (
    <div className="py-12 bg-zinc-50 min-h-[calc(100vh-80px)]">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1600px]">
        
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Sidebar (Copy from Profile for consistency) */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="p-8 text-center border-none shadow-xl bg-white rounded-3xl sticky top-24">
                <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-400">
                  <User size={40} />
                </div>
                <h2 className="text-2xl font-serif text-zinc-950">{userName || 'Cliente Decoty'}</h2>
                <p className="text-sm text-zinc-500 mb-8">{user?.email}</p>
                <div className="h-px bg-zinc-50 mb-8" />
                <div className="space-y-2">
                   {[
                     { label: 'Meus Pedidos', icon: Package, path: '/minha-conta' },
                     { label: 'Meus Favoritos', icon: Heart, path: '/minha-conta/favoritos' },
                     { label: 'Meus dados', icon: UserCircle, path: '/minha-conta/meus_dados', active: true }
                   ].map(item => (
                     <button 
                      key={item.label}
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                        item.active ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                      }`}
                     >
                       <div className="flex items-center gap-3">
                         <item.icon size={18} />
                         <span className="text-sm font-bold">{item.label}</span>
                       </div>
                       <ChevronRight size={16} />
                     </button>
                   ))}
                   <button 
                    onClick={() => {
                      signOut();
                      navigate('/entrar');
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all mt-4"
                   >
                     <LogOut size={18} />
                     <span className="text-sm font-bold">Sair da Conta</span>
                   </button>
                </div>
              </Card>
            </div>

            {/* Main Content Settings */}
            <div className="lg:col-span-9 space-y-6">
               <div className="flex items-center gap-4 mb-4">
                  <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => navigate('/minha-conta')}>
                    <ChevronRight size={24} className="rotate-180" />
                  </Button>
                  <h3 className="text-3xl font-serif text-zinc-950">Meus Dados</h3>
               </div>

               {success && (
                 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 mb-6">
                    <Save size={18} />
                    <span className="text-sm font-bold">{success}</span>
                 </motion.div>
               )}

               <div className="space-y-8">
                  {/* Informações Pessoais */}
                  <Card className="p-8 border-none shadow-sm rounded-3xl bg-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
                    <h4 className="text-xl font-serif mb-8 flex items-center gap-3 relative">
                      <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900">
                        <User size={20} />
                      </div>
                      Dados Pessoais
                    </h4>
                    
                    <form onSubmit={handleUpdateProfile} className="space-y-6 relative">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Nome Completo</label>
                             <input 
                               type="text" 
                               required
                               value={formData.nome}
                               onChange={e => setFormData({...formData, nome: e.target.value})}
                               className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-950 focus:bg-white transition-all shadow-sm"
                               placeholder="Seu nome completo"
                             />
                          </div>

                          <div>
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">E-mail (Login)</label>
                             <div className="relative">
                               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                               <input 
                                 type="email" 
                                 value={user?.email || ''} 
                                 disabled
                                 className="w-full bg-zinc-100 border border-zinc-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium text-zinc-400 cursor-not-allowed shadow-inner"
                               />
                             </div>
                             <p className="text-[10px] text-zinc-400 mt-2 ml-1">* O e-mail não pode ser alterado para sua segurança.</p>
                          </div>

                          <div>
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">CPF</label>
                             <div className="relative">
                               <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                               <input 
                                 type="text" 
                                 value={maskCPF(clientData?.cpf)} 
                                 disabled
                                 className="w-full bg-zinc-100 border border-zinc-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium text-zinc-400 cursor-not-allowed shadow-inner"
                               />
                             </div>
                             <p className="text-[10px] text-zinc-400 mt-2 ml-1">* O CPF será exibido parcialmente para sua segurança.</p>
                          </div>

                          <div>
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Celular / WhatsApp</label>
                             <div className="relative">
                               <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                               <input 
                                 type="text" 
                                 value={formData.celular}
                                 onChange={e => setFormData({...formData, celular: formatPhone(e.target.value)})}
                                 maxLength={16}
                                 className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-950 focus:bg-white transition-all shadow-sm"
                                 placeholder="(00) 0 0000-0000"
                               />
                             </div>
                          </div>

                          <div>
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Telefone Fixo (Opcional)</label>
                             <div className="relative">
                               <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                               <input 
                                 type="text" 
                                 value={formData.telefone_fixo}
                                 onChange={e => setFormData({...formData, telefone_fixo: formatPhone(e.target.value)})}
                                 maxLength={15}
                                 className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-950 focus:bg-white transition-all shadow-sm"
                                 placeholder="(00) 0000-0000"
                               />
                             </div>
                          </div>

                          <div className="md:col-span-2">
                             <label className="flex items-start gap-4 cursor-pointer p-4 bg-zinc-50 rounded-2xl hover:bg-zinc-100 transition-all border border-zinc-100 group">
                               <div className="relative flex items-center justify-center mt-1">
                                 <input 
                                   type="checkbox"
                                   checked={formData.receber_ofertas}
                                   onChange={e => setFormData({...formData, receber_ofertas: e.target.checked})}
                                   className="peer sr-only"
                                 />
                                 <div className="w-6 h-6 border-2 border-zinc-200 rounded-lg bg-white transition-all peer-checked:bg-zinc-900 peer-checked:border-zinc-900 group-hover:border-zinc-400" />
                                 <svg 
                                   className="absolute w-4 h-4 text-white opacity-0 transition-opacity peer-checked:opacity-100" 
                                   fill="none" 
                                   viewBox="0 0 24 24" 
                                   stroke="currentColor" 
                                   strokeWidth="4"
                                 >
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                 </svg>
                               </div>
                               <div>
                                 <p className="text-sm font-bold text-zinc-900">Quero receber ofertas da loja</p>
                                 <p className="text-xs text-zinc-500 leading-relaxed">
                                   O cliente aceita receber promoções via WhatsApp ou E-mail.
                                 </p>
                               </div>
                             </label>
                          </div>
                       </div>

                       <div className="h-px bg-zinc-50 my-8" />

                       {/* Endereço */}
                       <h4 className="text-xl font-serif mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900">
                          <MapPin size={20} />
                        </div>
                        Endereço de Entrega
                       </h4>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">CEP</label>
                             <input 
                               type="text" 
                               value={formData.cep}
                               onChange={e => setFormData({...formData, cep: formatCEP(e.target.value)})}
                               maxLength={9}
                               className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-950 focus:bg-white transition-all shadow-sm"
                               placeholder="00000-000"
                             />
                          </div>
                          <div className="md:col-span-2">
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Logradouro / Rua</label>
                             <input 
                               type="text" 
                               value={formData.logradouro}
                               onChange={e => setFormData({...formData, logradouro: e.target.value})}
                               className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-950 focus:bg-white transition-all shadow-sm"
                               placeholder="Rua, Avenida, etc."
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Número</label>
                             <input 
                               type="text" 
                               value={formData.numero}
                               onChange={e => setFormData({...formData, numero: e.target.value})}
                               className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-950 focus:bg-white transition-all shadow-sm"
                               placeholder="Nº"
                             />
                          </div>
                          <div className="md:col-span-2">
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Bairro</label>
                             <input 
                               type="text" 
                               value={formData.bairro}
                               onChange={e => setFormData({...formData, bairro: e.target.value})}
                               className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-950 focus:bg-white transition-all shadow-sm"
                               placeholder="Nome do bairro"
                             />
                          </div>
                          <div className="md:col-span-2">
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Cidade</label>
                             <input 
                               type="text" 
                               value={formData.cidade}
                               onChange={e => setFormData({...formData, cidade: e.target.value})}
                               className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-950 focus:bg-white transition-all shadow-sm"
                               placeholder="Sua cidade"
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Estado (UF)</label>
                             <input 
                               type="text" 
                               value={formData.estado}
                               onChange={e => setFormData({...formData, estado: e.target.value})}
                               className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-950 focus:bg-white transition-all shadow-sm"
                               placeholder="Ex: SP"
                             />
                          </div>
                          <div className="md:col-span-3">
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Complemento (Opcional)</label>
                             <input 
                               type="text" 
                               value={formData.complemento}
                               onChange={e => setFormData({...formData, complemento: e.target.value})}
                               className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-950 focus:bg-white transition-all shadow-sm"
                               placeholder="Apto, Bloco, Casa atrás, etc."
                             />
                          </div>
                       </div>

                       <div className="pt-4 flex justify-end">
                          <Button 
                            type="submit" 
                            disabled={saving}
                            className="bg-zinc-900 text-white rounded-2xl px-12 h-14 font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-black transition-all shadow-xl shadow-zinc-200"
                          >
                             {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                             Salvar Alterações
                          </Button>
                       </div>
                    </form>
                  </Card>

                  {/* Alterar Senha */}
                  <Card className="p-8 border-none shadow-sm rounded-3xl bg-white overflow-hidden relative">
                    <h4 className="text-xl font-serif mb-8 flex items-center gap-3 relative">
                      <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900">
                        <Lock size={20} />
                      </div>
                      Segurança e Senha
                    </h4>
                    
                    <form onSubmit={handleUpdatePassword} className="space-y-6 relative">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Nova Senha</label>
                             <input 
                               type="password" 
                               required
                               placeholder="No mínimo 6 dígitos"
                               value={passwordData.newPassword}
                               onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                               className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-950 focus:bg-white transition-all shadow-sm"
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Confirmar Nova Senha</label>
                             <input 
                               type="password" 
                               required
                               placeholder="Repita sua nova senha"
                               value={passwordData.confirmPassword}
                               onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                               className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-950 focus:bg-white transition-all shadow-sm"
                             />
                          </div>
                       </div>
                       
                       <p className="text-xs text-zinc-500 bg-amber-50 p-4 rounded-xl border border-amber-100/50">
                         <strong>Dica:</strong> Use uma senha forte com letras, números e símbolos para garantir a segurança da sua conta.
                       </p>

                       <div className="pt-2">
                          <Button 
                            type="submit" 
                            disabled={saving}
                            variant="outline"
                            className="border-zinc-900 text-zinc-900 rounded-2xl px-12 h-14 font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-zinc-50 transition-all"
                          >
                             {saving ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                             Atualizar Minha Senha
                          </Button>
                       </div>
                    </form>
                  </Card>
               </div>
            </div>

          </div>
        
      </div>
    </div>
  );
};
