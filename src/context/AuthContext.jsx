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
  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
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

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

const AUTH_ERROR_MESSAGES = {
  invalid_credentials: 'Onjuist e-mailadres of wachtwoord.',
  email_not_confirmed: 'Bevestig eerst je e-mailadres via de link in je inbox.',
  user_already_exists: 'Er bestaat al een account met dit e-mailadres.',
  email_exists: 'Er bestaat al een account met dit e-mailadres.',
  weak_password: 'Dit wachtwoord is te zwak. Kies een langer of sterker wachtwoord.',
  same_password: 'Het nieuwe wachtwoord moet anders zijn dan je huidige wachtwoord.',
  over_email_send_rate_limit: 'Te veel e-mails verstuurd. Probeer het over een paar minuten opnieuw.',
  over_request_rate_limit: 'Te veel pogingen. Probeer het over een paar minuten opnieuw.',
  session_not_found: 'Je sessie is verlopen. Vraag een nieuwe link aan.',
};

// eslint-disable-next-line react-refresh/only-export-components
export function authErrorMessage(err) {
  return AUTH_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Er ging iets mis. Probeer het opnieuw.';
}
