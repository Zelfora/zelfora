import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authErrorMessage, useAuth } from '../context/AuthContext';

const TITLES = {
  signin: 'Inloggen',
  signup: 'Account aanmaken',
  forgot: 'Wachtwoord vergeten',
};

const SUBMIT_LABELS = {
  signin: 'Inloggen',
  signup: 'Account aanmaken',
  forgot: 'Stuur resetlink',
};

function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, signIn, signUp, sendPasswordReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname ?? '/';

  if (!loading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const session = await signUp(email, password);
        if (session) {
          navigate(redirectTo, { replace: true });
        } else {
          setInfo('Account aangemaakt! Check je inbox en klik op de bevestigingslink om in te loggen.');
        }
      } else if (mode === 'forgot') {
        await sendPasswordReset(email);
        setInfo('Als er een account bij dit e-mailadres hoort, ontvang je een link om je wachtwoord te herstellen.');
      } else {
        await signIn(email, password);
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError('');
    setInfo('');
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16 md:px-8">
      <div className="rounded-card border border-border bg-surface/70 p-8 backdrop-blur-md">
        <h1 className="mb-6 font-display text-2xl font-semibold text-text">{TITLES[mode]}</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-pill border border-border bg-bg px-4 py-2.5 text-text placeholder:text-text-faint outline-none focus:border-primary-500 focus:shadow-glow"
          />
          {mode !== 'forgot' && (
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-pill border border-border bg-bg px-4 py-2.5 text-text placeholder:text-text-faint outline-none focus:border-primary-500 focus:shadow-glow"
            />
          )}

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="-mt-2 self-end text-xs text-text-muted hover:text-primary-300"
            >
              Wachtwoord vergeten?
            </button>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-accent-400">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-pill bg-gradient-to-r from-primary-500 to-accent-500 px-5 py-2.5 font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {submitting ? 'Even geduld...' : SUBMIT_LABELS[mode]}
          </button>
        </form>

        {mode === 'forgot' ? (
          <button onClick={() => switchMode('signin')} className="mt-4 text-sm text-text-muted hover:text-primary-300">
            Terug naar inloggen
          </button>
        ) : (
          <button
            onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
            className="mt-4 text-sm text-text-muted hover:text-primary-300"
          >
            {mode === 'signup' ? 'Heb je al een account? Log in' : 'Nog geen account? Maak er een aan'}
          </button>
        )}
      </div>
    </main>
  );
}

export default Login;
