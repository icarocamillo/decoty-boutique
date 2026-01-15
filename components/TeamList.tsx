import React, { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { User, ShieldCheck, Mail, Hash, UserX, UserCheck, Users, Lock, Loader2, AlertTriangle, ChevronRight } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { backendService } from '../services/backendService';
import { UserProfile } from '../types';

export const TeamList: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await backendService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao carregar time", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (targetUserId: string) => {
      const targetUser = users.find(u => u.id === targetUserId);
      if (!targetUser) return;

      const isCurrentlyActive = targetUser.active !== false;

      if (currentUser?.email && targetUser.email === currentUser.email) {
          alert("Ação bloqueada: Você não pode desativar seu próprio usuário enquanto está logado.");
          return;
      }

      const newStatus = !isCurrentlyActive;
      const success = await backendService.updateUserStatus(targetUserId, newStatus);
      
      if (success) {
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, active: newStatus } : u));
      } else {
        alert("Erro ao atualizar status do usuário. Verifique suas permissões.");
      }
  };

  const handleRoleChange = async (targetUserId: string, newRole: 'manager' | 'salesperson') => {
    const targetUser = users.find(u => u.id === targetUserId);
    if (!targetUser) return;

    if (currentUser?.email && targetUser.email === currentUser.email) {
      alert("Ação bloqueada: Você não pode alterar seu próprio perfil de acesso.");
      return;
    }

    const success = await backendService.updateUserRole(targetUserId, newRole);

    if (success) {
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole as any } : u));
    } else {
      alert("Erro ao atualizar perfil do usuário.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-white flex items-center gap-2">
             <Users className="text-zinc-600" /> Gerenciar Equipe
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">Controle de acesso dos usuários do sistema</p>
        </div>
      </div>

      <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800">
        {!isSupabaseConfigured() && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100 dark:border-yellow-900/30 text-xs text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
             <Hash size={14} />
             <span>Ambiente de Teste: Usuários salvos localmente.</span>
          </div>
        )}
        
        <div className="min-h-[300px]">
          {loading ? (
             <div className="flex justify-center items-center h-48 text-zinc-400">
               <Loader2 className="animate-spin mr-2" /> Carregando equipe...
             </div>
          ) : (
            <>
              {/* MOBILE VIEW: Card List */}
              <div className="flex flex-col gap-3 sm:hidden p-4 bg-zinc-50 dark:bg-zinc-950/50">
                {users.map((u) => {
                  const isActive = u.active !== false;
                  const isMe = currentUser?.email === u.email;
                  return (
                    <div 
                      key={u.id} 
                      className={`bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-sm transition-all flex flex-col gap-4 ${
                        !isActive ? 'opacity-60 grayscale border-red-100 dark:border-red-900/30 bg-zinc-50/50' : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${
                            isActive 
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 shadow-inner' 
                              : 'bg-red-50 dark:bg-red-900/20 text-red-500 border-red-100 dark:border-red-900/20'
                          }`}>
                            {u.role === 'manager' ? <ShieldCheck size={24} /> : <User size={24} />}
                          </div>
                          <div className="min-w-0">
                            <h3 className={`font-bold text-zinc-900 dark:text-white truncate text-base ${!isActive ? 'line-through' : ''}`}>
                              {u.name}
                              {isMe && <span className="ml-2 text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Você</span>}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5 text-zinc-500 dark:text-zinc-400">
                              <Mail size={12} className="shrink-0" />
                              <span className="text-xs truncate">{u.email}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant={isActive ? "success" : "destructive"} className="text-[10px] h-5 px-1.5">
                          {isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 items-end pt-3 border-t border-zinc-50 dark:border-zinc-800/50">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Perfil</span>
                          {isMe ? (
                            <Badge variant={u.role === 'manager' ? 'default' : 'secondary'} className="w-fit text-[10px]">
                              {u.role === 'manager' ? 'Gerente' : 'Vendedor'}
                            </Badge>
                          ) : (
                            <div className="relative">
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs py-2 pl-2 pr-6 outline-none font-bold text-zinc-700 dark:text-zinc-200 disabled:opacity-50 appearance-none"
                                disabled={!isActive}
                              >
                                <option value="manager">Gerente</option>
                                <option value="salesperson">Vendedor</option>
                              </select>
                              <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-zinc-400 pointer-events-none" size={12} />
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end">
                          <Button 
                            size="sm" 
                            variant={isActive ? "destructive" : "success"}
                            className="h-10 px-4 gap-2 text-xs font-bold w-full shadow-sm"
                            onClick={() => handleToggleStatus(u.id)}
                            disabled={isMe}
                          >
                            {isActive ? <><UserX size={16} /> Desativar</> : <><UserCheck size={16} /> Ativar</>}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: Standard Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4 font-medium">Nome</th>
                      <th className="px-6 py-4 font-medium">E-mail</th>
                      <th className="px-6 py-4 font-medium">Perfil de Acesso</th>
                      <th className="px-6 py-4 font-medium text-center">Status</th>
                      <th className="px-6 py-4 font-medium text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {users.map((user) => {
                      const isActive = user.active !== false; 
                      const isMe = currentUser?.email === user.email;

                      return (
                        <tr key={user.id} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors ${!isActive ? 'bg-zinc-50/80 dark:bg-zinc-900/80' : ''}`}>
                          <td className="px-6 py-4">
                            <div className={`flex items-center gap-3 ${!isActive ? 'opacity-50 grayscale' : ''}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shadow-inner' : 'bg-red-100 dark:bg-red-900/30 text-red-500'}`}>
                                {user.role === 'manager' ? <ShieldCheck size={16} /> : <User size={16} />}
                              </div>
                              <div>
                                <span className={`font-medium block ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 line-through'}`}>{user.name}</span>
                                {isMe && <span className="text-[10px] text-green-600 font-bold uppercase tracking-tight">(Você)</span>}
                              </div>
                            </div>
                          </td>
                          <td className={`px-6 py-4 text-zinc-600 dark:text-zinc-400 ${!isActive ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-2">
                              <Mail size={14} className="text-zinc-400" />
                              {user.email}
                            </div>
                          </td>
                          <td className={`px-6 py-4 ${!isActive ? 'opacity-50' : ''}`}>
                            {isMe ? (
                              <div className="flex items-center gap-2" title="Você não pode alterar seu próprio perfil">
                                <Badge variant={user.role === 'manager' ? 'default' : 'secondary'}>
                                    {user.role === 'manager' ? 'Gerente' : 'Vendedor'}
                                </Badge>
                                <Lock size={12} className="text-zinc-400" />
                              </div>
                            ) : (
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value as 'manager' | 'salesperson')}
                                className="bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-md text-sm py-1 pl-2 pr-8 focus:ring-2 focus:ring-zinc-500 outline-none cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 font-medium"
                                disabled={!isActive}
                              >
                                <option value="manager">Gerente</option>
                                <option value="salesperson">Vendedor</option>
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                                isActive 
                                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              {isActive ? 'Ativo' : 'Inativo'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button 
                              size="sm" 
                              variant={isActive ? "destructive" : "success"}
                              className="h-9 w-9 p-0 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={isMe ? "Você não pode se desativar" : (isActive ? "Desativar Acesso" : "Reativar Acesso")}
                              onClick={() => handleToggleStatus(user.id)}
                              disabled={isMe}
                            >
                                {isActive ? <UserX size={20} /> : <UserCheck size={20} />}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!loading && users.length === 0 && (
            <div className="p-12 text-center text-zinc-500">
              {isSupabaseConfigured() ? (
                <div className="flex flex-col items-center gap-4">
                   <Users size={48} className="text-zinc-300" />
                   <div className="space-y-1">
                      <p className="font-bold text-zinc-700 dark:text-zinc-200">Nenhum usuário encontrado</p>
                      <p className="text-sm max-w-xs mx-auto">Verifique se as tabelas e políticas de segurança (RLS) no Supabase estão configuradas corretamente.</p>
                   </div>
                   <div className="max-w-md p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30 text-xs text-blue-700 dark:text-blue-300 text-left flex gap-3">
                      <AlertTriangle className="shrink-0" size={20} />
                      <div>
                        <p className="font-bold mb-1">Nota para o Administrador</p>
                        <p>É necessário que os usuários existam na tabela <code>profiles</code> e que você possua permissão de leitura para visualizar esta lista.</p>
                      </div>
                   </div>
                </div>
              ) : (
                "Nenhum usuário encontrado no sistema."
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};