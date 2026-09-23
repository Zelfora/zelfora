import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authErrorMessage, useAuth } from '../context/AuthContext';

// Landing page for the password-recovery email link. Supabase exchanges the
// token in the URL for a session, so by the time this renders the user is
// signed in and only needs to choose a new password.
function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('De wachtwoorden komen niet overeen.');
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="px-4 py-16 text-center text-text-muted md:px-8">Laden...</main>;
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16 md:px-8">
      <div className="rounded-card border border-border bg-surface/70 p-8 backdrop-blur-md">
        <h1 className="mb-6 font-display text-2xl font-semibold text-text">Nieuw wachtwoord instellen</h1>

        {!user ? (
          <p className="text-sm text-text-muted">
            Deze link is ongeldig of verlopen.{' '}
            <Link to="/login" className="text-primary-300 hover:underline">
              Vraag een nieuwe aan
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Nieuw wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-pill border border-border bg-bg px-4 py-2.5 text-text placeholder:text-text-faint outline-none focus:border-primary-500 focus:shadow-glow"
            />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Herhaal wachtwoord"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-pill border border-border bg-bg px-4 py-2.5 text-text placeholder:text-text-faint outline-none focus:border-primary-500 focus:shadow-glow"
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-pill bg-gradient-to-r from-primary-500 to-accent-500 px-5 py-2.5 font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              {submitting ? 'Even geduld...' : 'Wachtwoord opslaan'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default ResetPassword;
