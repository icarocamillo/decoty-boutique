
import React, { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { User, ShieldCheck, Mail, Hash, UserX, UserCheck, Users, Lock, Loader2, AlertTriangle } from 'lucide-react';
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

      // 2. Impede desativar a si mesmo
      if (currentUser?.email && targetUser.email === currentUser.email) {
          alert("Ação bloqueada: Você não pode desativar seu próprio usuário enquanto está logado.");
          return;
      }

      const newStatus = !isCurrentlyActive;
      
      // Chamada ao Service
      const success = await backendService.updateUserStatus(targetUserId, newStatus);
      
      if (success) {
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, active: newStatus } : u));
      } else {
        alert("Erro ao atualizar status do usuário. Verifique suas permissões (RLS).");
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
      alert("Erro ao atualizar perfil do usuário. Verifique suas permissões (RLS).");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-white flex items-center gap-2">
             <Users className="text-zinc-600" /> Gerenciar Usuários
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">Controle de acesso da equipe</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {!isSupabaseConfigured() && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100 dark:border-yellow-900/30 text-xs text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
             <Hash size={14} />
             <span>Visualizando usuários salvos no <strong>Armazenamento Local (Ambiente de Teste)</strong>.</span>
          </div>
        )}
        
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
             <div className="flex justify-center items-center h-48 text-zinc-400">
               <Loader2 className="animate-spin mr-2" /> Carregando equipe...
             </div>
          ) : (
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' : 'bg-red-100 dark:bg-red-900/30 text-red-500'}`}>
                            {user.role === 'manager' ? <ShieldCheck size={16} /> : <User size={16} />}
                          </div>
                          <div>
                            <span className={`font-medium block ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 line-through'}`}>{user.name}</span>
                            {isMe && <span className="text-[10px] text-green-600 font-medium">(Você)</span>}
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
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      {isSupabaseConfigured() ? (
                        <div className="flex flex-col items-center gap-2">
                           <p>Nenhum usuário encontrado na tabela de perfis.</p>
                           <div className="max-w-md p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30 text-xs text-blue-700 dark:text-blue-300 text-left flex gap-3">
                              <AlertTriangle className="shrink-0" size={20} />
                              <div>
                                <p className="font-bold mb-1">Atenção ao RLS (Segurança)</p>
                                <p>Se você acabou de configurar o banco, é necessário executar os scripts SQL para:</p>
                                <ul className="list-disc ml-4 mt-1 space-y-1">
                                  <li>Importar usuários antigos para a tabela <code>profiles</code>.</li>
                                  <li>Criar políticas de acesso (RLS) para permitir que usuários vejam a lista.</li>
                                </ul>
                              </div>
                           </div>
                        </div>
                      ) : (
                        "Nenhum usuário encontrado."
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};
