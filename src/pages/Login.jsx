import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authErrorMessage, useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, signIn, signUp, sendPasswordReset } = useAuth();
  const i18n = useTranslation();
  const { t } = i18n;
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
    // Text Replacement shortcuts usually append a space.
    const address = email.trim();
    try {
      if (mode === 'signup') {
        const session = await signUp(address, password);
        if (session) {
          navigate(redirectTo, { replace: true });
        } else {
          setInfo(t('login.checkEmail'));
        }
      } else if (mode === 'forgot') {
        await sendPasswordReset(address);
        setInfo(t('login.resetSent'));
      } else {
        await signIn(address, password);
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(authErrorMessage(err, i18n));
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
        <h1 className="mb-6 font-display text-2xl font-semibold text-text">{t(`login.title.${mode}`)}</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="login-email" className="sr-only">
            {t('login.email')}
          </label>
          {/* type="text" + inputMode="email" instead of type="email": iOS disables
              autocorrect in email fields, which also blocks Text Replacement
              shortcuts (e.g. "@@" -> full address). The email keyboard, format
              check and password-manager hints are kept via the other attributes. */}
          <input
            id="login-email"
            name="email"
            type="text"
            inputMode="email"
            required
            autoComplete={mode === 'forgot' ? 'email' : 'username'}
            autoCapitalize="none"
            autoCorrect="on"
            pattern="\s*[^@\s]+@[^@\s]+\.[^@\s]+\s*"
            title={t('login.emailInvalid')}
            placeholder={t('login.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-pill border border-border bg-bg px-4 py-2.5 text-text placeholder:text-text-faint outline-none focus:border-primary-500 focus:shadow-glow"
          />
          {mode !== 'forgot' && (
            <label htmlFor="login-password" className="sr-only">
              {t('login.password')}
            </label>
          )}
          {mode !== 'forgot' && (
            <input
              id="login-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={t('login.password')}
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
              {t('login.forgotLink')}
            </button>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
          {info && <p className="text-sm text-accent-400">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-pill bg-gradient-to-r from-primary-500 to-accent-500 px-5 py-2.5 font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {submitting ? t('common.pleaseWait') : t(`login.submit.${mode}`)}
          </button>
        </form>

        {mode === 'forgot' ? (
          <button onClick={() => switchMode('signin')} className="mt-4 text-sm text-text-muted hover:text-primary-300">
            {t('login.backToSignIn')}
          </button>
        ) : (
          <button
            onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
            className="mt-4 text-sm text-text-muted hover:text-primary-300"
          >
            {mode === 'signup' ? t('login.toSignIn') : t('login.toSignUp')}
          </button>
        )}
      </div>
    </main>
  );
}

export default Login;
