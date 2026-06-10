import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Usuario } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Usuario | null;
  role: 'profissional' | 'cliente' | null;
  isProfissional: boolean;
  isCliente: boolean;
  clienteId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(session.user);
      setLoading(true);

      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!data) {
        // Usuário autenticado mas sem registro em usuarios → logout automático
        await supabase.auth.signOut();
        return;
      }

      setProfile(data);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('usuarios').select('*').eq('id', user.id).maybeSingle();
    if (data) setProfile(data);
  };

  const role: 'profissional' | 'cliente' | null = profile?.role ?? null;
  const isProfissional = role === 'profissional';
  const isCliente = role === 'cliente';
  const clienteId = profile?.cliente_id ?? null;

  return (
    <AuthContext.Provider value={{
      user, profile, role, isProfissional, isCliente, clienteId,
      loading, signIn, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
