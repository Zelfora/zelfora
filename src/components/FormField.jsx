import { useTranslation } from '../context/LanguageContext';

// Visible label above a form control, with an optional hint underneath.
function FormField({ label, optional = false, hint, className = '', children }) {
  const { t } = useTranslation();

  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-text">
        {label}
        {optional && <span className="font-normal text-text-faint"> ({t('form.optional')})</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-text-faint">{hint}</span>}
    </label>
  );
}

export default FormField;
