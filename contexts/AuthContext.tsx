
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured, withRetry, refreshSessionIfExpiring } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  userRole: 'manager' | 'salesperson' | null;
  userName: string | null;
  isOnline: boolean;
  refreshSession: () => Promise<void>;
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const validateCurrentSession = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    
    try {
      // getSession() é preferível a getUser() para garantir refresh de tokens JWT
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) throw error;

      if (currentSession?.user) {
         const { data: profile } = await supabase
           .from('profiles')
           .select('name, role, active')
           .eq('id', currentSession.user.id)
           .maybeSingle();

         if (!profile || profile.active === false) {
            await signOut();
         } else {
            setSession(currentSession);
            setUser(currentSession.user);
            setUserName(profile.name);
            setUserRole(profile.role as 'manager' | 'salesperson');
         }
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (e) {
      console.error("Erro ao validar sessão:", e);
    }
  }, []);

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

    const checkAuth = async () => {
      setLoading(true);
      await validateCurrentSession();
      setLoading(false);

      if (isSupabaseConfigured()) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
            await validateCurrentSession();
          } else if (session?.user) {
             const { data: profile } = await supabase
               .from('profiles')
               .select('name, role, active')
               .eq('id', session.user.id)
               .maybeSingle();

             if (!profile || profile.active === false) {
                await signOut();
             } else {
                setSession(session);
                setUser(session.user);
                setUserName(profile.name);
                setUserRole(profile.role as 'manager' | 'salesperson');
             }
          }
          setLoading(false);
        });

        // RE-VALIDAÇÃO ATIVA: Dispara ao voltar para a aba ou focar na janela
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            validateCurrentSession();
          }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', validateCurrentSession);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', validateCurrentSession);
        };
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
  }, [validateCurrentSession]);

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };

      if (data.user) {
         const { data: profile } = await supabase
           .from('profiles')
           .select('name, role, active')
           .eq('id', data.user.id)
           .maybeSingle();
         
         if (!profile || profile.active === false) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            return { error: { message: 'Seu usuário foi desativado. Por favor, procure a gerencia.' } };
         }

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
      if (foundUser.active === false) return { error: { message: 'Seu usuário foi desativado.' } };

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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role, active: true } }
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

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    }
    setSession(null);
    setUser(null);
    setUserName(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      signIn, 
      signUp, 
      signOut, 
      loading, 
      userRole, 
      userName, 
      isOnline,
      refreshSession: validateCurrentSession 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
