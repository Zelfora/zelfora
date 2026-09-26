import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authErrorMessage, useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import FormMessage from '../components/FormMessage';
import PageMessage from '../components/PageMessage';
import { inputClass, primaryButtonClass } from '../components/formHelpers';

// Landing page for the password recovery email link. Supabase exchanges the
// token in the URL for a session and announces it as a recovery, so the user
// can choose a new password without knowing the current one. Anyone else who
// is signed in changes it on their profile, which asks for the current
// password first, so an unattended signed-in browser can't be used here.
function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, passwordRecovery, updatePassword } = useAuth();
  const i18n = useTranslation();
  const { t } = i18n;
  const navigate = useNavigate();

  // Supabase queues the recovery announcement just before it finishes
  // loading, so one task later it has arrived if it's coming. Until then,
  // don't call the link invalid.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => setSettled(true), 0);
    return () => clearTimeout(timer);
  }, [loading]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(t('password.mismatch'));
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err, i18n));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !settled) {
    return <PageMessage>{t('common.loading')}</PageMessage>;
  }

  let content;
  if (user && passwordRecovery) {
    content = (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Hidden username field lets password managers update the right entry. */}
        <input type="email" autoComplete="username" value={user.email} readOnly hidden />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-label={t('password.new')}
          placeholder={t('password.new')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-label={t('password.repeat')}
          placeholder={t('password.repeat')}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />

        <FormMessage error={error} />

        <button type="submit" disabled={submitting} className={`mt-2 ${primaryButtonClass}`}>
          {submitting ? t('common.pleaseWait') : t('reset.save')}
        </button>
      </form>
    );
  } else if (user) {
    content = (
      <p className="text-sm text-text-muted">
        {t('reset.signedIn')}{' '}
        <Link to="/profile" className="text-primary-300 hover:underline">
          {t('nav.profile')}
        </Link>
      </p>
    );
  } else {
    content = (
      <p className="text-sm text-text-muted">
        {t('reset.invalidLink')}{' '}
        <Link to="/login" className="text-primary-300 hover:underline">
          {t('reset.requestNew')}
        </Link>
        .
      </p>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16 md:px-8">
      <div className="rounded-card border border-border bg-surface/70 p-8 backdrop-blur-md">
        <h1 className="mb-6 font-display text-2xl font-semibold text-text">{t('reset.title')}</h1>
        {content}
      </div>
    </main>
  );
}

export default ResetPassword;
