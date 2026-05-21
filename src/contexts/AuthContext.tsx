import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase } from '@/services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { backendService } from '@/services/backendService';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error: any; role?: 'manager' | 'salesperson' | 'customer' | null }>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: any; promoted?: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  loading: boolean;
  userRole: 'manager' | 'salesperson' | 'customer' | null;
  userName: string | null;
  userEmail: string | null;
  staffName: string | null;
  staffEmail: string | null;
  clientOrigin: 'site_only' | 'store_only' | 'both' | null;
  isSiteAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'manager' | 'salesperson' | 'customer' | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [staffEmail, setStaffEmail] = useState<string | null>(null);
  const [clientOrigin, setClientOrigin] = useState<'site_only' | 'store_only' | 'both' | null>(null);

  const isSiteAuthenticated = !!session && (clientOrigin === 'site_only' || clientOrigin === 'both');

  const fetchClientData = async (userId: string) => {
    const { data, error } = await getSupabase()
      .from('clients')
      .select('nome, email, origin')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error || !data) return null;
    return data;
  };

  const fetchProfileData = async (userId: string) => {
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('name, email, role')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !data) return null;
    return data;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: currentSession } } = await getSupabase().auth.getSession();
      
      if (currentSession?.user) {
         const { data: profile } = await getSupabase()
           .from('profiles')
           .select('name, role, active, email')
           .eq('id', currentSession.user.id)
           .maybeSingle();

         if (profile) {
            if (profile.active === false) {
               await getSupabase().auth.signOut();
               setSession(null);
               setUser(null);
            } else {
               setSession(currentSession);
               setUser(currentSession.user);
               
               // Dados ERP (Profiles)
               setStaffName(profile.name);
               setStaffEmail(profile.email || currentSession.user.email || null);
               
               // Dados Site (Clients)
               const clientData = await fetchClientData(currentSession.user.id);
               if (clientData) {
                  setUserName(clientData.nome);
                  setUserEmail(clientData.email);
                  setClientOrigin(clientData.origin);
               } else {
                  setUserName(null);
                  setUserEmail(null);
                  setClientOrigin(null);
               }
               
               setUserRole(profile.role as 'manager' | 'salesperson');
            }
         } else {
            setSession(currentSession);
            setUser(currentSession.user);
            
            setStaffName(null);
            setStaffEmail(null);
            
            // Buscar dados na tabela clients
            const clientData = await fetchClientData(currentSession.user.id);
            if (clientData) {
               setUserName(clientData.nome);
               setUserEmail(clientData.email);
               setClientOrigin(clientData.origin);
            } else {
               setUserName(currentSession.user.user_metadata?.name || null);
               setUserEmail(currentSession.user.email || null);
               setClientOrigin(null);
            }
            setUserRole('customer');
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
             .select('name, role, active, email')
             .eq('id', session.user.id)
             .maybeSingle();

           if (profile) {
              if (profile.active === false) {
                 await getSupabase().auth.signOut();
                 setSession(null);
                 setUser(null);
                 setUserName(null);
                 setUserRole(null);
                 setUserEmail(null);
                 setStaffName(null);
                 setStaffEmail(null);
              } else {
                 setSession(session);
                 setUser(session.user);
                 
                 // Dados ERP (Profiles)
                 setStaffName(profile.name);
                 setStaffEmail(profile.email || session.user.email || null);
                 
                 // Dados Site (Clients)
                 const clientData = await fetchClientData(session.user.id);
                 if (clientData) {
                    setUserName(clientData.nome);
                    setUserEmail(clientData.email);
                    setClientOrigin(clientData.origin);
                 } else {
                    setUserName(null);
                    setUserEmail(null);
                    setClientOrigin(null);
                 }
                 
                 setUserRole(profile.role as 'manager' | 'salesperson');
              }
           } else {
              setSession(session);
              setUser(session.user);
              
              setStaffName(null);
              setStaffEmail(null);

              // Buscar dados na tabela clients
              const clientData = await fetchClientData(session.user.id);
              if (clientData) {
                 setUserName(clientData.nome);
                 setUserEmail(clientData.email);
                 setClientOrigin(clientData.origin);
              } else {
                 setUserName(session.user.user_metadata?.name || null);
                 setUserEmail(session.user.email || null);
                 setClientOrigin(null);
              }
              setUserRole('customer');
           }
        } else {
           setSession(null);
           setUser(null);
           setUserName(null);
           setUserRole(null);
           setUserEmail(null);
           setStaffName(null);
           setStaffEmail(null);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    // 1. Tenta o login na Auth do Supabase
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) return { error };

    if (data.user) {
       // 2. Tenta obter perfil de funcionário
        const { data: profile } = await getSupabase()
          .from('profiles')
          .select('name, role, active, email')
          .eq('id', data.user.id)
          .maybeSingle();
       
       if (profile) {
          if (profile.active === false) {
             await getSupabase().auth.signOut();
             setSession(null);
             setUser(null);
             return { 
               error: { message: 'Seu usuário foi desativado. Por favor, procure a gerencia.' } 
             };
          }
          setSession(data.session);
          setUser(data.user);
          
          // Dados ERP (Profiles)
          setStaffName(profile.name);
          setStaffEmail(profile.email || data.user.email || null);
          
          // Dados Site (Clients)
          const clientData = await fetchClientData(data.user.id);
          if (clientData) {
             setUserName(clientData.nome);
             setUserEmail(clientData.email);
             setClientOrigin(clientData.origin);
          } else {
             setUserName(null);
             setUserEmail(null);
             setClientOrigin(null);
          }
          
          setUserRole(profile.role as 'manager' | 'salesperson');
          return { error: null, role: profile.role as any };
       }

       // Se não tem perfil, é considerado cliente
       setSession(data.session);
       setUser(data.user);
       
       // Buscar dados na tabela clients
       const clientData = await fetchClientData(data.user.id);
       if (clientData) {
          setUserName(clientData.nome);
          setUserEmail(clientData.email);
          setClientOrigin(clientData.origin);
       } else {
          setUserName(data.user.user_metadata?.name || null);
          setUserEmail(data.user.email || null);
          setClientOrigin(null);
       }
       setUserRole('customer');
       return { error: null, role: 'customer' };
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    // 1. Primeiro, tenta o cadastro normal
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { name, role, active: true }
      }
    });

    // 2. Se o erro for de usuário já cadastrado, verificamos se ele é um cliente do site
    if (error && (error.message.includes('already registered') || error.status === 422)) {
       // Tenta logar para comprovar propriedade da conta e obter permissão de alteração (via RLS)
       const { data: signInData, error: signInError } = await getSupabase().auth.signInWithPassword({ email, password });
       
       if (signInError) {
          return { error: { message: 'Este e-mail já está cadastrado. Se você é um cliente do site e deseja acessar o ERP, digite sua senha atual para autorizar o vínculo.' } };
       }
       
       if (signInData.user) {
          // Busca o perfil agora que estamos logados
          const { data: profile } = await getSupabase()
            .from('profiles')
            .select('id, role')
            .eq('id', signInData.user.id)
            .maybeSingle();

          // Ajuste ERP: Se não estamos cadastrando um 'customer', estamos tentando cadastrar um funcionário.
          // Se o login funcionou, significa que a conta já existe (ex: cliente do site).
          if (role !== 'customer') {
             // 1. Atualizar origin na tabela clients para 'both' e vincular user_id
             await backendService.updateClientOriginByEmail(email, signInData.user.id, 'both');

             // 2. Criar ou atualizar perfil na tabela profiles com o cargo escolhido (upsert)
             const { error: profileError } = await getSupabase()
               .from('profiles')
               .upsert({ 
                 id: signInData.user.id,
                 email,
                 name,
                 role, 
                 active: true 
               });

             await getSupabase().auth.signOut();
             if (profileError) return { error: profileError };
             return { error: null, promoted: true };
          } else if (profile && (profile.role === 'manager' || profile.role === 'salesperson') && role === 'customer') {
             // Caso inverso: Funcionário tentando se cadastrar no site (Vínculo com site)
             return { error: null, promoted: false };
          } else {
             // Se já for cliente e tentar se cadastrar como cliente novamente (redundante)
             await getSupabase().auth.signOut();
             return { error: { message: 'Este e-mail já está vinculado a uma conta ativa no sistema.' } };
          }
       }
    }

    return { error };
  };

  const sendPasswordResetEmail = async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await getSupabase().auth.updateUser({ password: newPassword });
      return { error };
    } catch (err) {
      console.error("Erro ao atualizar senha:", err);
      return { error: err };
    }
  };

  const signOut = async () => {
    await getSupabase().auth.signOut();
    setSession(null);
    setUser(null);
    setUserName(null);
    setUserEmail(null);
    setClientOrigin(null);
    setStaffName(null);
    setStaffEmail(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      signIn, 
      signUp, 
      signOut, 
      sendPasswordResetEmail, 
      updatePassword, 
      loading, 
      userRole, 
      userName, 
      userEmail,
      staffName,
      staffEmail,
      clientOrigin,
      isSiteAuthenticated
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