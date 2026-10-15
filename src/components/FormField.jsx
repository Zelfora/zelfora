import { useTranslation } from '../context/LanguageContext';

// Visible label above a form control, with an optional hint underneath.
// Use group for controls made of several inputs (such as ImageInput): a
// <label> may only wrap a single control, so those get a <fieldset> instead.
// Use controlId for a control that shows more than itself, such as
// AddressInput's suggestions: the label then points to it by id instead of
// wrapping it, so the suggestions don't become part of its name.
function FormField({ label, optional = false, hint, group = false, controlId, className = '', children }) {
  const { t } = useTranslation();

  const title = (
    <>
      {label}
      {optional && <span className="font-normal text-text-faint"> ({t('form.optional')})</span>}
    </>
  );

  if (group) {
    return (
      <fieldset className={className}>
        <legend className="mb-1.5 text-sm font-medium text-text">{title}</legend>
        {children}
        {hint && <span className="mt-1.5 block text-xs text-text-faint">{hint}</span>}
      </fieldset>
    );
  }

  if (controlId) {
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        <label htmlFor={controlId} className="text-sm font-medium text-text">
          {title}
        </label>
        {children}
        {hint && <span className="text-xs text-text-faint">{hint}</span>}
      </div>
    );
  }

  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-text">{title}</span>
      {children}
      {hint && <span className="text-xs text-text-faint">{hint}</span>}
    </label>
  );
}

export default FormField;
