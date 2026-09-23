import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setInfo('Account aangemaakt! Bevestig je e-mailadres (indien vereist) en log daarna in.');
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleMode() {
    setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
    setError('');
    setInfo('');
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16 md:px-8">
      <div className="rounded-card border border-border bg-surface/70 p-8 backdrop-blur-md">
        <h1 className="mb-6 font-display text-2xl font-semibold text-text">
          {mode === 'signup' ? 'Account aanmaken' : 'Inloggen'}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-pill border border-border bg-bg px-4 py-2.5 text-text placeholder:text-text-faint outline-none focus:border-primary-500 focus:shadow-glow"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-pill border border-border bg-bg px-4 py-2.5 text-text placeholder:text-text-faint outline-none focus:border-primary-500 focus:shadow-glow"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-accent-400">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-pill bg-gradient-to-r from-primary-500 to-accent-500 px-5 py-2.5 font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {submitting ? 'Even geduld...' : mode === 'signup' ? 'Account aanmaken' : 'Inloggen'}
          </button>
        </form>

        <button onClick={toggleMode} className="mt-4 text-sm text-text-muted hover:text-primary-300">
          {mode === 'signup' ? 'Heb je al een account? Log in' : 'Nog geen account? Maak er een aan'}
        </button>
      </div>
    </main>
  );
}

export default Login;
