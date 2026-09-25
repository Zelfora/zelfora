import { Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

// Also the entry point to the owner portal on small screens, where the
// navbar has no room for the link.
function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-sm text-text-muted sm:flex-row sm:justify-between md:px-8">
        <span className="font-display font-semibold text-text">
          Zelfora<span className="text-text-muted">.nl</span>
        </span>
        <span>
          {t('footer.partnerPrompt')}{' '}
          <Link to="/partner" className="font-semibold text-primary-300 hover:text-primary-400">
            {t('footer.partnerLink')}
          </Link>
        </span>
      </div>
    </footer>
  );
}

export default Footer;
