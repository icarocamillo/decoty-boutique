
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, User, Loader2, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { backendService } from '@/services/backendService';
import { getSupabase } from '@/services/supabaseClient';

type AuthMode = 'login' | 'register';

export const CustomerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp, signOut, isSiteAuthenticated } = useAuth();
  
  // Se já estiver autenticado no site, manda para home
  React.useEffect(() => {
    if (isSiteAuthenticated) navigate('/');
  }, [isSiteAuthenticated, navigate]);

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [needsCpfVerification, setNeedsCpfVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setCpf(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === 'login') {
      const { error: loginError } = await signIn(email, password);
      if (loginError) {
        setError(loginError.message || 'Erro ao realizar login. Verifique suas credenciais.');
        setLoading(false);
      } else {
        // Obter usuário recém logado (precisamos pegar do supabase pois o estado do context pode não ter atualizado ainda no closure)
        const { data: { user } } = await getSupabase().auth.getUser();
        
        if (user) {
          const client = await backendService.getClientByUserId(user.id);
          if (!client) {
             // É funcionário mas não tem registro de cliente
             setError('Você já possui acesso ao ERP como funcionário, mas precisa se cadastrar como cliente para acessar o site. Clique em "Criar Nova Conta" abaixo para vincular seu perfil.');
             // Desloga por segurança para não "entrar" sem o registro
             await signOut();
             setLoading(false);
             return;
          }

          if (client.origin === 'store_only') {
             setError('Seu cadastro está configurado apenas para compras na loja física. Para acessar o site, você deve atualizar seu cadastro ou entrar em contato com a gerência.');
             await signOut();
             setLoading(false);
             return;
          }
        }
        navigate('/');
      }
    } else {
      // REGISTRATION MODE
      
      // 1. Se ainda não verificamos o email, verificamos agora
      if (!needsCpfVerification) {
        try {
          const { needsLink, name: storeName, isStaff } = await backendService.checkClientByEmail(email);
          if (needsLink) {
            setNeedsCpfVerification(true);
            if (storeName && !name) setName(storeName);
            setLoading(false);
            return;
          }
          if (isStaff && !success) {
            setSuccess('Você já é um colaborador da Decoty! Digite sua senha habitual para ativar seu acesso como cliente no site.');
          }
        } catch (err) {
          console.error("Erro ao verificar email na base de dados:", err);
        }
      }

      // 2. Cria a conta no Auth do Supabase
      const { error: signUpError } = await signUp(email, password, name, 'customer');
      
      if (signUpError) {
        setError(signUpError.message || 'Erro ao criar conta. Tente novamente.');
        setLoading(false);
      } else {
        // 3. Se precisava de vínculo, faz o vínculo agora que temos o user_id (via login efetuado internamente ou pronto para login)
        // Como o signUp desloga o "promoted" (nosso caso de ERP), mas para cliente normal ele pode manter logado.
        // Vamos tentar o vínculo usando o email e cpf.
        
        // Precisamos do user_id. Como o signUp retorna uma sessão as vezes, vamos pegar do auth.
        // Se for promovido, ele desloga. Se for novo ele pode precisar logar.
        
        // No contexto atual, signUp para 'customer' cria o registro. 
        // Vamos tentar obter a sessão atual.
        const { data: { session } } = await getSupabase().auth.getSession();
        
        if (session?.user) {
          if (needsCpfVerification) {
            const { success: linkSuccess, error: linkError } = await backendService.linkClientWithCpf(email, cpf, session.user.id);
            if (!linkSuccess) {
              setError(linkError || 'Sua conta foi criada, mas não conseguimos vincular ao seu cadastro da loja. Por favor, verifique seu CPF no perfil depois.');
            }
          } else {
            // Se for um novo cliente direto do site, cria o registro na tabela clients
            await backendService.getOrCreateClientForUser(session.user.id, name, email);
          }
        }

        setSuccess('Conta criada com sucesso! Você já pode entrar.');
        setMode('login');
        setLoading(false);
        setNeedsCpfVerification(false);
        setCpf('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Visual Side (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-40">
           <img 
             src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070" 
             className="w-full h-full object-cover"
             alt="Fashion"
           />
        </div>
        <div className="relative z-10 text-center px-12">
           <BrandLogo size="lg" className="bg-white mx-auto mb-8 scale-150" />
           <h1 className="font-rouge text-6xl text-white mb-4">Decoty Boutique</h1>
           <p className="text-white text-lg tracking-widest uppercase font-light">Sua jornada de estilo começa aqui</p>
           
           <div className="mt-12 grid grid-cols-2 gap-8 text-left">
              <div className="p-6 border border-white/10 rounded-2xl backdrop-blur-sm">
                 <div className="text-white font-bold mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-zinc-400" />
                    Exclusividade
                 </div>
                 <p className="text-white text-sm">Acesso antecipado a novas coleções e peças limitadas.</p>
              </div>
              <div className="p-6 border border-white/10 rounded-2xl backdrop-blur-sm">
                 <div className="text-white font-bold mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-zinc-400" />
                    Conveniência
                 </div>
                 <p className="text-white text-sm">Histórico de pedidos e checkout agilizado para suas compras.</p>
              </div>
              <div className="p-6 border border-white/10 rounded-2xl backdrop-blur-sm">
                 <div className="text-white font-bold mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-zinc-400" />
                    Inspiração
                 </div>
                 <p className="text-white text-sm">Tendências e dicas de estilo pensadas para elevar sua autoestima.</p>
              </div>
              <div className="p-6 border border-white/10 rounded-2xl backdrop-blur-sm">
                 <div className="text-white font-bold mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-zinc-400" />
                    Organização
                 </div>
                 <p className="text-white text-sm">Selecione suas roupas favoritas para compra-las quando desejar.</p>
              </div>
           </div>
        </div>
        
        {/* Golden/Silver accents */}
        <div className="absolute top-0 right-0 w-1/2 h-px bg-gradient-to-l from-zinc-500 to-transparent opacity-30" />
        <div className="absolute bottom-0 left-0 w-1/2 h-px bg-gradient-to-r from-zinc-500 to-transparent opacity-30" />
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 bg-white">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden mb-12 text-center">
             <BrandLogo size="md" className="mx-auto mb-4" />
             <h2 className="font-rouge text-3xl">Decoty Boutique</h2>
          </div>

          <div className="mb-10">
            <Link 
              to="/" 
              className="group inline-flex items-center gap-1.5 text-xs uppercase tracking-widest font-black text-zinc-400 hover:text-zinc-950 transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              <span>Voltar ao Site</span>
            </Link>

            <h2 className="text-3xl font-serif text-zinc-950 mb-2">
              {mode === 'login' ? 'Bem-vinda de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-zinc-500">
              {mode === 'login' 
                ? 'Acesse sua área exclusiva para acompanhar seus pedidos.' 
                : 'Junte-se a nós e descubra o melhor da moda feminina.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
              transition={{ duration: 0.3 }}
            >
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-3 border border-red-100 italic">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm font-medium flex items-center gap-3 border border-emerald-100 italic">
                  <CheckCircle2 size={18} />
                  {success}
                </div>
              )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {mode === 'register' && (
                      <div className="space-y-1.5 focus-within:text-zinc-950 text-zinc-400 group">
                        <label className="text-xs font-black uppercase tracking-widest ml-1 transition-colors group-focus-within:text-zinc-900">Nome Completo</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2" size={18} />
                          <input 
                            type="text" 
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:border-zinc-950 outline-none transition-all placeholder:text-zinc-300"
                            placeholder="Como gostaria de ser chamada?"
                          />
                        </div>
                      </div>
                    )}

                    {mode === 'register' && needsCpfVerification && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1.5 focus-within:text-zinc-950 text-zinc-400 group"
                      >
                        <label className="text-xs font-black uppercase tracking-widest ml-1 transition-colors group-focus-within:text-zinc-900">Confirmação de CPF</label>
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2" size={18} />
                          <input 
                            type="text" 
                            required
                            value={cpf}
                            onChange={handleCpfChange}
                            className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-emerald-200 rounded-2xl text-zinc-900 focus:bg-white focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-300 ring-2 ring-emerald-50/50"
                            placeholder="000.000.000-00"
                          />
                        </div>
                        <p className="text-[10px] text-emerald-600 font-medium ml-1 italic">Vimos que você já possui cadastro na loja física! Para sua segurança, confirme o CPF cadastrado.</p>
                      </motion.div>
                    )}

                <div className="space-y-1.5 focus-within:text-zinc-950 text-zinc-400 group">
                  <label className="text-xs font-black uppercase tracking-widest ml-1 transition-colors group-focus-within:text-zinc-900">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2" size={18} />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:border-zinc-950 outline-none transition-all placeholder:text-zinc-300"
                      placeholder="exemplo@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 focus-within:text-zinc-950 text-zinc-400 group">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black uppercase tracking-widest transition-colors group-focus-within:text-zinc-900">Senha</label>
                    {mode === 'login' && (
                      <Link to="/recuperar-senha?type=site" size="sm" className="text-[10px] uppercase font-bold text-zinc-400 hover:text-zinc-950 transition-colors">
                        Esqueceu?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2" size={18} />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:border-zinc-950 outline-none transition-all placeholder:text-zinc-300"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800 font-bold text-base shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      {mode === 'login' ? 'Entrar na Minha Área' : 'Cadastrar Minha Conta'}
                      <ArrowRight size={20} />
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 pt-8 border-t border-zinc-100 text-center">
             <p className="text-sm text-zinc-500 mb-4">
                {mode === 'login' ? 'Ainda não faz parte da Decoty?' : 'Já possui uma conta?'}
             </p>
             <button 
               onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
               className="w-full py-4 border border-zinc-200 rounded-2xl text-zinc-900 font-bold hover:bg-zinc-50 transition-colors uppercase text-xs tracking-widest"
             >
                {mode === 'login' ? 'Criar Nova Conta' : 'Voltar para o Login'}
             </button>
          </div>
          

        </div>
      </div>
    </div>
  );
};
