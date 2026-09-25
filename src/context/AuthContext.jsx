import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Returns the new session when email confirmation is disabled, otherwise null.
  // The confirmation link brings the user back to redirectPath. Paths other than
  // "/" must be allowed under Auth > URL Configuration > Redirect URLs, otherwise
  // Supabase falls back to the Site URL.
  async function signUp(email, password, redirectPath = '/') {
    const path = redirectPath === '/' ? '' : redirectPath;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}${path}` },
    });
    if (error) throw error;
    return data.session;
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async function updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  // Re-verifies the current password before changing it, so an unattended
  // signed-in browser can't be used to take over the account.
  async function changePassword(currentPassword, newPassword) {
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    });
    if (verifyError) {
      if (verifyError.code === 'invalid_credentials') {
        throw Object.assign(new Error('Current password is incorrect'), { code: 'current_password_incorrect' });
      }
      throw verifyError;
    }
    await updatePassword(newPassword);
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// Maps a Supabase auth error to a message in the current language.
// eslint-disable-next-line react-refresh/only-export-components
export function authErrorMessage(err, { t, has }) {
  const key = `authError.${err?.code}`;
  if (has(key)) return t(key);
  return err?.message ?? t('authError.generic');
}
