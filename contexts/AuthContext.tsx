
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  userRole: 'manager' | 'salesperson' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Chave para persistência local no modo Mock
const LOCAL_STORAGE_USERS_KEY = 'decoty_users';
const LOCAL_STORAGE_SESSION_KEY = 'decoty_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'manager' | 'salesperson' | null>(null);

  // Inicializa usuários mock
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Verifica se já existem usuários para não sobrescrever status de ativação editados
      const existingUsersStr = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      let existingUsers = existingUsersStr ? JSON.parse(existingUsersStr) : [];
      
      const defaultUsers = [
        {
          id: 'user-icaro-gen',
          email: 'icarogen@email.com',
          password: '123456',
          name: 'Ícaro Camillo G',
          role: 'manager',
          active: true
        },
        {
          id: 'user-icaro-ven',
          email: 'icaroven@email.com',
          password: '123456',
          name: 'Ícaro Camillo V',
          role: 'salesperson',
          active: true
        }
      ];

      let hasChanges = false;

      // 1. Adiciona os usuários padrão solicitados se não existirem
      defaultUsers.forEach(defUser => {
         if (!existingUsers.find((u: any) => u.email === defUser.email)) {
            existingUsers.push(defUser);
            hasChanges = true;
         }
      });

      // 2. Remove o antigo usuário de teste genérico para limpar o ambiente
      const oldTestEmail = 'icaro_teste@email.com';
      if (existingUsers.some((u: any) => u.email === oldTestEmail)) {
         existingUsers = existingUsers.filter((u: any) => u.email !== oldTestEmail);
         hasChanges = true;
      }

      if (hasChanges || existingUsers.length === 0) {
          localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(existingUsers));
      }
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (isSupabaseConfigured()) {
        console.log("Status: Conectando ao Supabase Oficial...");
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Erro ao verificar sessão do Supabase:", error.message);
        }

        if (session?.user) {
           // Verifica na tabela PROFILES para garantir integridade do status e role atualizados
           const { data: profile } = await supabase
             .from('profiles')
             .select('role, active')
             .eq('id', session.user.id)
             .maybeSingle();

           // Se tiver perfil e estiver inativo, derruba a sessão
           if (profile && profile.active === false) {
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setUserRole(null);
              setLoading(false);
              return;
           }

           setSession(session);
           setUser(session.user);
           
           // Usa a role do perfil se existir, senão fallback para metadata
           if (profile?.role) {
             setUserRole(profile.role as 'manager' | 'salesperson');
           } else if (session.user.user_metadata?.role) {
             setUserRole(session.user.user_metadata.role);
           }
        } else {
           setSession(null);
           setUser(null);
           setUserRole(null);
        }
        
        setLoading(false);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
             // Mesma verificação no evento de mudança
             const { data: profile } = await supabase
               .from('profiles')
               .select('role, active')
               .eq('id', session.user.id)
               .maybeSingle();

             if (profile && profile.active === false) {
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
                setUserRole(null);
                return;
             }

             setSession(session);
             setUser(session.user);
             if (profile?.role) {
                setUserRole(profile.role as 'manager' | 'salesperson');
             } else if (session.user.user_metadata?.role) {
                setUserRole(session.user.user_metadata.role);
             } else {
                setUserRole(null);
             }
          } else {
             setSession(null);
             setUser(null);
             setUserRole(null);
          }
          setLoading(false);
        });

        return () => subscription.unsubscribe();
      } else {
        console.log("Status: Modo Mock (LocalStorage).");
        // Modo Demo: Recupera sessão do localStorage
        const storedSession = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          
          // Validação Mock na persistência
          const storedUsersRaw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
          const users = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
          const currentUserData = users.find((u: any) => u.id === parsed.user.id);
          
          if (currentUserData && currentUserData.active === false) {
             localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
             setSession(null);
             setUser(null);
             setLoading(false);
             return;
          }

          setSession(parsed);
          setUser(parsed.user);
          setUserRole(parsed.user.user_metadata.role);
        }
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        return { error };
      }

      // Verificação pós-login na tabela PROFILES
      if (data.user) {
         // 1. Tenta buscar o perfil
         const { data: profile } = await supabase
           .from('profiles')
           .select('role, active') // Importante: selecionar role também para setar estado imediato
           .eq('id', data.user.id)
           .maybeSingle();
         
         if (profile && profile.active === false) {
            await supabase.auth.signOut();
            return { 
              error: { message: 'Erro ao conectar no sistema, seu usuário foi desativado. Procure a gerencia.' } 
            };
         }

         // 2. Proteção contra Race Condition:
         // Verificar se o listener não derrubou a sessão
         const { data: { session: currentSession } } = await supabase.auth.getSession();
         if (!currentSession) {
             return { 
               error: { message: 'Erro ao conectar no sistema, seu usuário foi desativado. Procure a gerencia.' } 
             };
         }

         // 3. ATUALIZAÇÃO IMEDIATA DO ESTADO (BUGFIX)
         // Não esperamos o onAuthStateChange disparar, atualizamos aqui para que o redirect no LoginPage funcione
         setSession(data.session);
         setUser(data.user);
         
         if (profile?.role) {
            setUserRole(profile.role as 'manager' | 'salesperson');
         } else if (data.user.user_metadata?.role) {
            setUserRole(data.user.user_metadata.role);
         }
      }

      return { error: null };
    } else {
      // Mock Login com Validação no LocalStorage
      await new Promise(resolve => setTimeout(resolve, 600));

      const storedUsersRaw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      const users = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      
      const foundUser = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

      if (!foundUser) {
        return { error: { message: 'E-mail ou senha incorretos.' } };
      }

      // --- VALIDAÇÃO DE STATUS MOCK ---
      if (foundUser.active === false) {
         return { error: { message: 'Erro ao conectar no sistema, seu usuário foi desativado. Procure a gerencia.' } };
      }

      const mockUser = {
        id: foundUser.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: foundUser.email,
        email_confirmed_at: new Date().toISOString(),
        app_metadata: { provider: 'email' },
        user_metadata: { name: foundUser.name, role: foundUser.role },
        created_at: new Date().toISOString(),
      } as User;

      const mockSession = {
        access_token: 'mock-token-' + Date.now(),
        refresh_token: 'mock-refresh-' + Date.now(),
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser
      } as Session;

      setSession(mockSession);
      setUser(mockUser);
      setUserRole(foundUser.role);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(mockSession));
      
      return { error: null };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role, active: true } // Garante que nasce ativo
        }
      });
      return { error };
    } else {
      // Mock SignUp: Salva no LocalStorage
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const storedUsersRaw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      const users = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

      if (users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
        return { error: { message: 'E-mail já cadastrado.' } };
      }

      const newUser = {
        id: 'user-' + Date.now(),
        email,
        password, // Em produção jamais salvaríamos senha pura, mas isso é um Mock local
        name,
        role,
        active: true // Novos usuários nascem ativos
      };

      users.push(newUser);
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));

      return { error: null };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    } else {
      setSession(null);
      setUser(null);
      setUserRole(null);
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, signIn, signUp, signOut, loading, userRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
