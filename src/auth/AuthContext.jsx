import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../db/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithEmail(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw error;
  }

  async function verifyOtp(email, token) {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function changeEmail(newEmail) {
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: window.location.origin + window.location.pathname },
    );
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, verifyOtp, signOut, changeEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
