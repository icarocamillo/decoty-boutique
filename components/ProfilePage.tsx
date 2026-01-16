
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Check, Loader2, ShieldCheck, AlertCircle, Save, KeyRound, LogOut } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { backendService } from '../services/backendService';
import { useNavigate } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, userName, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: userName || '',
        email: user.email || ''
      });
    }
  }, [user, userName]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoadingProfile(true);
    setMessage(null);
    
    try {
      const result = await backendService.updateProfile(user.id, { 
        name: formData.name, 
        email: formData.email !== user.email ? formData.email : undefined 
      });

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: formData.email !== user.email 
            ? "Perfil atualizado! Verifique seu novo e-mail para confirmar a alteração." 
            : "Dados pessoais atualizados com sucesso!" 
        });
      } else {
        setMessage({ type: 'error', text: result.error || "Erro ao atualizar perfil." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Erro técnico ao processar solicitação." });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    if (!passwordData.currentPassword) {
      setMessage({ type: 'error', text: "Você deve informar sua senha atual." });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: "A nova senha deve ter no mínimo 6 caracteres." });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: "As senhas não coincidem." });
      return;
    }

    setLoadingPassword(true);
    setMessage(null);

    try {
      const result = await backendService.updatePassword(
        user.email, 
        passwordData.currentPassword, 
        passwordData.newPassword
      );

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: "Senha alterada com sucesso! Você será desconectado em instantes para validar o novo acesso." 
        });
        
        // Bloqueia interações e inicia contagem regressiva para logout
        setIsLoggingOut(true);
        
        setTimeout(async () => {
            await signOut();
            navigate('/login');
        }, 3000);

      } else {
        setMessage({ type: 'error', text: result.error || "Erro ao alterar senha." });
        setLoadingPassword(false);
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Erro técnico ao processar solicitação." });
      setLoadingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-white flex items-center gap-2">
             <User className="text-zinc-600" /> Meu Perfil
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">Gerencie suas informações de acesso e segurança</p>
        </div>
        <Badge variant={userRole === 'manager' ? 'default' : 'secondary'} className="px-4 py-1.5 text-sm uppercase tracking-wider h-auto">
            Acesso: {userRole === 'manager' ? 'Gerente' : 'Vendedor'}
        </Badge>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-fade-in border ${
          message.type === 'success' 
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' 
          : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-700 dark:text-red-400'
        }`}>
          {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{message.text}</span>
          {isLoggingOut && <Loader2 className="animate-spin ml-auto" size={18} />}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Card: Dados Pessoais */}
        <Card title={<div className="flex items-center gap-2 text-zinc-800 dark:text-white"><User size={18} /> Dados Pessoais</div>}>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome Exibido</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                            type="text" 
                            required
                            disabled={isLoggingOut}
                            className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none disabled:opacity-50"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">E-mail de Login</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                            type="email" 
                            required
                            disabled={isLoggingOut}
                            className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none disabled:opacity-50"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    <p className="text-[10px] text-zinc-400">Alterações de e-mail podem exigir re-login e confirmação.</p>
                </div>

                <div className="pt-4">
                    <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={loadingProfile || isLoggingOut}>
                        {loadingProfile ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Salvar Alterações</>}
                    </Button>
                </div>
            </form>
        </Card>

        {/* Card: Segurança */}
        <Card title={<div className="flex items-center gap-2 text-zinc-800 dark:text-white"><KeyRound size={18} /> Segurança</div>}>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Senha Atual</label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                            type="password" 
                            required
                            disabled={isLoggingOut}
                            placeholder="Sua senha de login atual"
                            className="w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        />
                    </div>
                </div>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-4"></div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nova Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                            type="password" 
                            required
                            disabled={isLoggingOut}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none disabled:opacity-50"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Confirmar Nova Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                            type="password" 
                            required
                            disabled={isLoggingOut}
                            placeholder="Repita a nova senha"
                            className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none disabled:opacity-50"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <Button type="submit" variant="secondary" className="w-full flex items-center justify-center gap-2" disabled={loadingPassword || isLoggingOut}>
                        {loadingPassword ? (
                            <><Loader2 className="animate-spin" size={18} /> Processando...</>
                        ) : isLoggingOut ? (
                            <><LogOut size={18} /> Encerrando Sessão...</>
                        ) : (
                            <><Check size={18} /> Atualizar Senha</>
                        )}
                    </Button>
                </div>
            </form>
        </Card>
      </div>

      <div className="bg-zinc-100 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-start gap-4">
          <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg text-zinc-400"><ShieldCheck size={24} /></div>
          <div>
              <h4 className="text-sm font-bold text-zinc-800 dark:text-white">Privacidade e Acesso</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Suas credenciais são protegidas por criptografia de ponta no banco de dados. 
                  Como vendedor ou gerente, você possui responsabilidade sobre as movimentações registradas em seu nome. 
                  Nunca compartilhe sua senha.
              </p>
          </div>
      </div>
    </div>
  );
};
