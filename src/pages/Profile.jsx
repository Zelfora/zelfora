import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authErrorMessage, useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { inputClass, primaryButtonClass } from '../components/formHelpers';
import Avatar from '../components/Avatar';
import SingleImageForm from '../components/SingleImageForm';

function Profile() {
  const { user, profile, signOut, changePassword, updateProfile } = useAuth();
  const i18n = useTranslation();
  const { t, formatDate } = i18n;
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (newPassword !== confirm) {
      setError(t('password.mismatch'));
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setInfo(t('profile.passwordChanged'));
    } catch (err) {
      setError(authErrorMessage(err, i18n));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10 md:px-8">
      <div className="flex items-center gap-4">
        <Avatar src={profile?.avatar_url} name={user.email} className="h-14 w-14 text-xl shadow-glow" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-text">{t('profile.title')}</h1>
          <p className="truncate text-sm text-text-muted">{user.email}</p>
        </div>
      </div>

      <section className="rounded-card border border-border bg-surface/70 p-6 backdrop-blur-md">
        <h2 className="mb-4 font-display text-lg font-semibold text-text">{t('profile.account')}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-text-muted">{t('profile.email')}</dt>
          <dd className="truncate text-text">{user.email}</dd>
          <dt className="text-text-muted">{t('profile.memberSince')}</dt>
          <dd className="text-text">{formatDate(user.created_at, { dateStyle: 'long' })}</dd>
        </dl>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/orders"
            className="rounded-pill border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-primary-500"
          >
            {t('profile.viewOrders')}
          </Link>
          <Link
            to="/partner"
            className="rounded-pill border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-primary-500"
          >
            {t('profile.partnerPortal')}
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded-pill border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-danger hover:text-danger"
          >
            {t('nav.signOut')}
          </button>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface/70 p-6 backdrop-blur-md">
        <h2 className="mb-4 font-display text-lg font-semibold text-text">{t('profile.photo')}</h2>
        <SingleImageForm
          kind="avatar"
          label={t('profile.photo')}
          current={profile?.avatar_url ?? null}
          save={(url) => updateProfile({ avatar_url: url })}
          renderPreview={(src) => <Avatar src={src} name={user.email} className="h-24 w-24 text-3xl" />}
        />
      </section>

      <section className="rounded-card border border-border bg-surface/70 p-6 backdrop-blur-md">
        <h2 className="mb-4 font-display text-lg font-semibold text-text">{t('profile.changePassword')}</h2>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          {/* Hidden username field lets password managers update the right entry. */}
          <input type="email" autoComplete="username" value={user.email} readOnly hidden />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder={t('password.current')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={t('password.new')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={t('password.repeat')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />

          {error && <p className="text-sm text-danger">{error}</p>}
          {info && <p className="text-sm text-accent-400">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className={`mt-2 ${primaryButtonClass}`}
          >
            {submitting ? t('common.pleaseWait') : t('profile.savePassword')}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Profile;
