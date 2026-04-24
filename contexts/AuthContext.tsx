import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  loading: boolean;
  userRole: 'manager' | 'salesperson' | null;
  userName: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USERS_KEY = 'decoty_users';
const LOCAL_STORAGE_SESSION_KEY = 'decoty_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'manager' | 'salesperson' | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Inicializa usuários mock apenas para ambiente de teste
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const existingUsersStr = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      let existingUsers = existingUsersStr ? JSON.parse(existingUsersStr) : [];
      if (existingUsers.length === 0) {
          const defaultUsers = [
            { id: 'user-manager', email: 'gerente@decoty.com', password: '123', name: 'Gerente Decoty', role: 'manager', active: true },
            { id: 'user-sales', email: 'vendedor@decoty.com', password: '123', name: 'Vendedor Decoty', role: 'salesperson', active: true }
          ];
          localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(defaultUsers));
      }
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (isSupabaseConfigured()) {
        const { data: { session: currentSession } } = await getSupabase().auth.getSession();
        
        if (currentSession?.user) {
           const { data: profile } = await getSupabase()
             .from('profiles')
             .select('name, role, active')
             .eq('id', currentSession.user.id)
             .maybeSingle();
 
           if (!profile || profile.active === false) {
              await getSupabase().auth.signOut();
              setSession(null);
              setUser(null);
           } else {
              setSession(currentSession);
              setUser(currentSession.user);
              setUserName(profile.name);
              setUserRole(profile.role as 'manager' | 'salesperson');
           }
        }
        
        setLoading(false);
 
        const { data: { subscription } } = getSupabase().auth.onAuthStateChange(async (event, session) => {
          // TOKEN_REFRESHED: token renovado automaticamente — apenas atualiza a sessão,
          // sem rebuscar perfil e sem mexer no loading (evita piscar a tela).
          if (event === 'TOKEN_REFRESHED') {
            if (session) setSession(session);
            return;
          }
 
          // Quando ocorre um login (ou refresh), validamos o perfil ANTES de definir o estado da aplicação
          if (session?.user) {
             const { data: profile } = await getSupabase()
               .from('profiles')
               .select('name, role, active')
               .eq('id', session.user.id)
               .maybeSingle();
 
             if (!profile || profile.active === false) {
                // Se o usuário logou mas está desativado no banco
                await getSupabase().auth.signOut();
                setSession(null);
                setUser(null);
                setUserName(null);
                setUserRole(null);
             } else {
                setSession(session);
                setUser(session.user);
                setUserName(profile.name);
                setUserRole(profile.role as 'manager' | 'salesperson');
             }
          } else {
             setSession(null);
             setUser(null);
             setUserName(null);
             setUserRole(null);
          }
          setLoading(false);
        });

        return () => subscription.unsubscribe();
      } else {
        const storedSession = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          const users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || '[]');
          const currentUserData = users.find((u: any) => u.id === parsed.user.id);
          
          if (!currentUserData || currentUserData.active === false) {
             localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
             setSession(null);
             setUser(null);
          } else {
             setSession(parsed);
             setUser(parsed.user);
             setUserName(currentUserData.name);
             setUserRole(currentUserData.role);
          }
        }
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured()) {
      // 1. Tenta o login na Auth do Supabase
      const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) return { error };

      if (data.user) {
         // 2. Imediatamente após o sucesso da senha, verifica o status na tabela profiles
         const { data: profile } = await getSupabase()
           .from('profiles')
           .select('name, role, active')
           .eq('id', data.user.id)
           .maybeSingle();
         
         // 3. Bloqueio Mandatário
         if (!profile || profile.active === false) {
            await getSupabase().auth.signOut();
            // Limpa estados por segurança
            setSession(null);
            setUser(null);
            return { 
              error: { message: 'Seu usuário foi desativado. Por favor, procure a gerencia.' } 
            };
         }

         // Se chegou aqui, o login é válido e o usuário está ativo
         setSession(data.session);
         setUser(data.user);
         setUserName(profile.name);
         setUserRole(profile.role as 'manager' | 'salesperson');
      }

      return { error: null };
    } else {
      await new Promise(resolve => setTimeout(resolve, 600));
      const users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || '[]');
      const foundUser = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

      if (!foundUser) return { error: { message: 'E-mail ou senha incorretos.' } };
      
      if (foundUser.active === false) {
          return { error: { message: 'Seu usuário foi desativado. Por favor, procure a gerencia.' } };
      }

      const mockUser = { id: foundUser.id, email: foundUser.email, user_metadata: { name: foundUser.name, role: foundUser.role } } as any;
      const mockSession = { user: mockUser } as any;

      setSession(mockSession);
      setUser(mockUser);
      setUserName(foundUser.name);
      setUserRole(foundUser.role);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(mockSession));
      return { error: null };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
          data: { name, role, active: true }
        }
      });
      return { error };
    } else {
      const users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || '[]');
      if (users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) return { error: { message: 'E-mail já cadastrado.' } };
      users.push({ id: 'u' + Date.now(), email, password, name, role, active: true });
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
      return { error: null };
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    }
    // Mock
    return { error: null };
  };

  const updatePassword = async (newPassword: string) => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await getSupabase().auth.updateUser({ password: newPassword });
        return { error };
      } catch (err) {
        console.error("Erro ao atualizar senha:", err);
        return { error: err };
      }
    }
    return { error: null };
  };

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await getSupabase().auth.signOut();
    } else {
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    }
    setSession(null);
    setUser(null);
    setUserName(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, signIn, signUp, signOut, sendPasswordResetEmail, updatePassword, loading, userRole, userName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};