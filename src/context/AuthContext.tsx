import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    // Hydrate session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Keep in sync with auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, username: string): Promise<{ needsConfirmation: boolean }> {
    if (!supabase) throw new Error('Supabase not initialised');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) throw toUserError(error);

    // If session is null, Supabase requires email confirmation
    const needsConfirmation = !data.session;
    return { needsConfirmation };
  }

  async function signIn(email: string, password: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialised');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw toUserError(error);
  }

  async function signOut(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toUserError(err: AuthError): Error {
  // Surface friendly messages for common cases
  if (err.message.includes('Invalid login credentials')) return new Error('Incorrect email or password.');
  if (err.message.includes('Email not confirmed'))       return new Error('Please confirm your email address first.');
  if (err.message.includes('User already registered'))  return new Error('An account with this email already exists.');
  if (err.message.includes('Password should be'))       return new Error('Password must be at least 6 characters.');
  return new Error(err.message);
}
