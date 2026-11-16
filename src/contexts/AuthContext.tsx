import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getSupabase } from '@/services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { backendService } from '@/services/backendService';

type UserRole = 'manager' | 'salesperson' | 'customer';
type ClientOrigin = 'site_only' | 'store_only' | 'both';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error: any; role?: UserRole | null }>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: any; promoted?: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  loading: boolean;
  userRole: UserRole | null;
  userName: string | null;
  userEmail: string | null;
  staffName: string | null;
  staffEmail: string | null;
  clientOrigin: ClientOrigin | null;
  isSiteAuthenticated: boolean;
}

/** Quem é o usuário para a aplicação: dados de `profiles` (ERP) e de `clients` (site). */
interface Identity {
  role: UserRole;
  staffName: string | null;
  staffEmail: string | null;
  userName: string | null;
  userEmail: string | null;
  clientOrigin: ClientOrigin | null;
}

type IdentityResult =
  | { status: 'ok'; identity: Identity }
  | { status: 'inactive' }
  // Alguma leitura falhou ou demorou demais. `fallback` é a melhor identidade possível com o
  // que foi lido (sem perfil lido, o usuário é tratado como cliente, como o sistema sempre fez).
  | { status: 'error'; fallback: Identity };

interface SyncOutcome {
  role: UserRole | null;
  inactive?: boolean;
}

const INACTIVE_USER_MESSAGE = 'Seu usuário foi desativado. Por favor, procure a gerencia.';
const LOGIN_INCOMPLETE_MESSAGE = 'Não foi possível concluir o login. Verifique sua conexão e tente novamente.';

// Esperas entre as novas tentativas de leitura do perfil na primeira carga (falha transitória de rede).
const IDENTITY_RETRY_DELAYS_MS = [600, 1500];
// Limite de cada leitura de perfil. Sem ele, uma requisição pendurada deixaria a tela em
// "Carregando acesso..." para sempre.
const IDENTITY_TIMEOUT_MS = 8000;

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// A aplicação só lê `id`, `email` e `user_metadata` do usuário. Se esses três não mudaram,
// mantemos o mesmo objeto para não disparar efeitos que dependem de `user` (formulários).
const isSameUser = (a: User, b: User) =>
  a.id === b.id &&
  a.email === b.email &&
  JSON.stringify(a.user_metadata ?? null) === JSON.stringify(b.user_metadata ?? null);

const isSameSession = (a: Session, b: Session) =>
  a.access_token === b.access_token && isSameUser(a.user, b.user);

/**
 * Lê `profiles` e `clients` e devolve a identidade. Não altera estado e nunca lança exceção.
 * Nunca chamar de dentro do callback de `onAuthStateChange` (ver o aviso no provider).
 *
 * `error` cobre falha ou demora em qualquer uma das duas leituras. `fallback` é a melhor
 * identidade possível com o que foi lido: quem chama decide se usa (primeira carga) ou se
 * mantém o que já está na tela (revalidação em segundo plano).
 */
const loadIdentity = async (user: User): Promise<IdentityResult> => {
  const customerFromUser: Identity = {
    role: 'customer',
    staffName: null,
    staffEmail: null,
    userName: user.user_metadata?.name || null,
    userEmail: user.email || null,
    clientOrigin: null,
  };

  try {
    const supabase = getSupabase();

    const queries = Promise.all([
      supabase.from('profiles').select('name, role, active, email').eq('id', user.id).maybeSingle(),
      supabase.from('clients').select('nome, email, origin').eq('user_id', user.id).maybeSingle(),
    ]);
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), IDENTITY_TIMEOUT_MS));
    const settled = await Promise.race([queries, timeout]);
    if (settled === null) return { status: 'error', fallback: customerFromUser };

    const [profileRes, clientRes] = settled;
    const profile = profileRes.error ? null : profileRes.data;
    const clientData = clientRes.error || !clientRes.data ? null : clientRes.data;

    if (profile && profile.active === false) return { status: 'inactive' };

    const identity: Identity = profile
      ? {
          role: profile.role as UserRole,
          staffName: profile.name,
          staffEmail: profile.email || user.email || null,
          userName: clientData ? clientData.nome : null,
          userEmail: clientData ? clientData.email : null,
          clientOrigin: clientData ? clientData.origin : null,
        }
      : clientData
        ? { ...customerFromUser, userName: clientData.nome, userEmail: clientData.email, clientOrigin: clientData.origin }
        : customerFromUser;

    if (profileRes.error || clientRes.error) return { status: 'error', fallback: identity };
    return { status: 'ok', identity };
  } catch (err) {
    console.error('[AuthContext] Erro ao carregar o perfil do usuário:', err);
    return { status: 'error', fallback: customerFromUser };
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [staffEmail, setStaffEmail] = useState<string | null>(null);
  const [clientOrigin, setClientOrigin] = useState<ClientOrigin | null>(null);

  // Última sessão informada pelo supabase-js (null = sem sessão).
  const latestSessionRef = useRef<Session | null>(null);
  // Usuário cuja identidade (papel, nomes) já está aplicada no estado.
  const resolvedUserIdRef = useRef<string | null>(null);
  // Muda a cada logout e a cada login feito por esta aba. Uma leitura iniciada em uma
  // "geração" anterior nunca é reaproveitada nem aplicada.
  const generationRef = useRef(0);
  // Leitura de identidade em andamento, para não repetir a mesma consulta em paralelo.
  const inflightRef = useRef<{ userId: string; generation: number; promise: Promise<SyncOutcome> } | null>(null);

  const isSiteAuthenticated = !!session && (clientOrigin === 'site_only' || clientOrigin === 'both');

  const applySignedOut = useCallback(() => {
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUserName(null);
    setUserEmail(null);
    setStaffName(null);
    setStaffEmail(null);
    setClientOrigin(null);
  }, []);

  // Mantém as mesmas referências quando nada relevante mudou. Ao voltar para a aba, o supabase-js
  // reenvia a sessão que já temos: sem isso, cada troca de aba recarregaria todos os dados e
  // reiniciaria formulários que dependem de `user`.
  const applySession = useCallback((next: Session) => {
    setSession(prev => (prev && isSameSession(prev, next) ? prev : next));
    setUser(prev => (prev && isSameUser(prev, next.user) ? prev : next.user));
  }, []);

  const applyIdentity = useCallback((identity: Identity) => {
    setUserRole(identity.role);
    setStaffName(identity.staffName);
    setStaffEmail(identity.staffEmail);
    setUserName(identity.userName);
    setUserEmail(identity.userEmail);
    setClientOrigin(identity.clientOrigin);
  }, []);

  // Encerra a sessão no estado local: invalida leituras em andamento e limpa tudo.
  const endLocalSession = useCallback(() => {
    generationRef.current += 1;
    inflightRef.current = null;
    latestSessionRef.current = null;
    resolvedUserIdRef.current = null;
    applySignedOut();
  }, [applySignedOut]);

  /**
   * Lê a identidade do usuário e aplica no estado junto com a sessão mais recente.
   * Na primeira vez para um usuário (ou com `fresh`, usado no login), a sessão só entra no
   * estado junto com o papel: a tela nunca vê um usuário novo com o papel do anterior.
   * Nas seguintes é uma revalidação em segundo plano: se a leitura falhar, o que está na
   * tela é mantido.
   */
  const syncIdentity = useCallback((targetUser: User, options: { fresh?: boolean } = {}): Promise<SyncOutcome> => {
    const userId = targetUser.id;
    const generation = generationRef.current;
    const inflight = inflightRef.current;
    if (!options.fresh && inflight && inflight.userId === userId && inflight.generation === generation) {
      return inflight.promise;
    }

    const isCurrent = () =>
      generationRef.current === generation && latestSessionRef.current?.user?.id === userId;

    const run = async (): Promise<SyncOutcome> => {
      const firstTime = options.fresh === true || resolvedUserIdRef.current !== userId;

      let result = await loadIdentity(targetUser);
      // Primeira carga: tenta de novo antes de desistir (falha transitória de rede).
      for (let i = 0; firstTime && result.status === 'error' && i < IDENTITY_RETRY_DELAYS_MS.length; i++) {
        await wait(IDENTITY_RETRY_DELAYS_MS[i]);
        if (!isCurrent()) return { role: null };
        result = await loadIdentity(targetUser);
      }

      // O usuário saiu ou trocou de conta enquanto consultávamos: o resultado não vale mais.
      if (!isCurrent()) return { role: null };

      if (result.status === 'inactive') {
        endLocalSession();
        setLoading(false);
        await getSupabase().auth.signOut();
        return { role: null, inactive: true };
      }

      if (result.status === 'error' && !firstTime) {
        // Revalidação em segundo plano falhou (ex.: rede instável ao voltar para a aba):
        // mantém a identidade atual em vez de rebaixar o funcionário ou deslogar o cliente.
        return { role: null };
      }

      const identity = result.status === 'ok' ? result.identity : result.fallback;
      const latest = latestSessionRef.current;
      if (!latest) return { role: null };

      resolvedUserIdRef.current = userId;
      applySession(latest);
      applyIdentity(identity);
      setLoading(false);
      return { role: identity.role };
    };

    const promise = run().finally(() => {
      if (inflightRef.current && inflightRef.current.promise === promise) inflightRef.current = null;
    });
    inflightRef.current = { userId, generation, promise };
    return promise;
  }, [applyIdentity, applySession, endLocalSession]);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event, nextSession) => {
      // ATENÇÃO: este callback roda enquanto o supabase-js segura a trava de sessão
      // (navigator.locks, compartilhada entre as abas). Ele precisa ser síncrono e NÃO pode
      // chamar o Supabase: qualquer consulta feita aqui espera a mesma trava, que só é liberada
      // quando o callback termina. O resultado é um bloqueio permanente desta aba e de todas as
      // outras abas abertas do sistema, até um F5. Consultas ficam para depois, via setTimeout.
      if (!active) return;

      if (!nextSession?.user) {
        endLocalSession();
        setLoading(false);
        return;
      }

      latestSessionRef.current = nextSession;

      const nextUser = nextSession.user;

      // Mesmo usuário já carregado (volta para a aba, renovação de token, alteração de cadastro):
      // atualiza a sessão na hora. Para usuário novo, a sessão entra junto com o papel, em syncIdentity.
      if (resolvedUserIdRef.current === nextUser.id) {
        applySession(nextSession);
      }

      // Renovação de token não muda perfil nem papel.
      if (event === 'TOKEN_REFRESHED') return;

      setTimeout(() => {
        if (!active) return;
        if (latestSessionRef.current?.user?.id !== nextUser.id) return;
        void syncIdentity(nextUser);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession, endLocalSession, syncIdentity]);

  const signIn = async (email: string, password: string) => {
    // 1. Tenta o login na Auth do Supabase
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) return { error };

    if (data.user && data.session) {
      // 2. Carrega perfil de funcionário e dados de cliente antes de devolver o papel a quem chamou.
      // Login é sempre uma leitura nova: não reaproveita revalidação antiga em andamento.
      generationRef.current += 1;
      latestSessionRef.current = data.session;
      const outcome = await syncIdentity(data.user, { fresh: true });

      if (outcome.inactive) {
        return { error: { message: INACTIVE_USER_MESSAGE } };
      }
      if (!outcome.role) {
        // A sessão mudou durante o login (ex.: logout em outra aba). Não confirma um login sem papel.
        return { error: { message: LOGIN_INCOMPLETE_MESSAGE } };
      }
      return { error: null, role: outcome.role };
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
    endLocalSession();
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
