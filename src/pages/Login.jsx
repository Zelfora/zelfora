import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { authErrorMessage, useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import FormMessage from '../components/FormMessage';
import PageMessage from '../components/PageMessage';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '../components/formHelpers';

// Only paths on this site, so ?next= can't send anyone elsewhere.
function safePath(path) {
  return path && /^\/(?![/\\])/.test(path) ? path : null;
}

// A cancelled or failed sign-in with Google comes back here with the error in
// the address, in the query and the fragment (see signInWithProvider).
function providerError() {
  const params = new URLSearchParams(window.location.search);
  new URLSearchParams(window.location.hash.slice(1)).forEach((value, key) => params.set(key, value));
  if (!params.has('error') && !params.has('error_code')) return null;
  return { code: params.get('error_code') ?? params.get('error'), message: params.get('error_description') };
}

// Google's "G" in its own colors, as Google's branding guidelines require.
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5 flex-shrink-0" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

// Standard login markup so iCloud Keychain and other password managers work.
// Note: iOS always treats the email field here as the Keychain username field
// (even outside the <form> or on a separate step), so iOS email suggestions and
// Text Replacement shortcuts can't be shown in it. Tested extensively; don't retry.
function Login() {
  const i18n = useTranslation();
  const { t } = i18n;
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => {
    const err = providerError();
    return err ? authErrorMessage(err, i18n) : '';
  });
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Back from Google: Supabase is still reading the session from the address.
  const [returningFromProvider] = useState(() => window.location.hash.includes('access_token='));
  const { user, loading, signIn, signInWithProvider, signUp, sendPasswordReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectTo = location.state?.from?.pathname ?? safePath(searchParams.get('next')) ?? '/';

  if (!loading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (loading && returningFromProvider) {
    return <PageMessage>{t('common.pleaseWait')}</PageMessage>;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    const address = email.trim();
    try {
      if (mode === 'signup') {
        const session = await signUp(address, password, redirectTo);
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

  // Leaves the page for Google's; there is nothing to wait for here.
  async function handleGoogle() {
    setError('');
    setInfo('');
    try {
      await signInWithProvider('google', redirectTo);
    } catch (err) {
      setError(authErrorMessage(err, i18n));
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

        {mode !== 'forgot' && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              className={`flex w-full items-center justify-center gap-3 ${secondaryButtonClass}`}
            >
              <GoogleLogo />
              {t('login.withGoogle')}
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-text-muted">
              <span className="h-px flex-1 bg-border" />
              {t('login.or')}
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="login-email" className="sr-only">
            {t('login.email')}
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete={mode === 'forgot' ? 'email' : 'username'}
            placeholder={t('login.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />

          {mode !== 'forgot' && (
            <>
              <label htmlFor="login-password" className="sr-only">
                {t('login.password')}
              </label>
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
                className={inputClass}
              />
            </>
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

          <FormMessage error={error} info={info} />

          <button
            type="submit"
            disabled={submitting}
            className={`mt-2 ${primaryButtonClass}`}
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
