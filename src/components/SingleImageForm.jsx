import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import ImageInput from './ImageInput';
import { primaryButtonClass, secondaryButtonClass } from './formHelpers';
import { commitImage, imageErrorKey, isValidImageValue } from '../services/images';

// A form with just one image and a save button, such as a restaurant's photo
// or a profile photo. current is the stored URL (or null); save(url) stores a
// new URL on its row and must throw on failure.
function SingleImageForm({ kind, label, current, save, renderPreview }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(current ?? '');
  const [savedCurrent, setSavedCurrent] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Follow the stored value when it changes elsewhere (e.g. it finished loading).
  if (current !== savedCurrent) {
    setSavedCurrent(current);
    setValue(current ?? '');
  }

  const changed = value !== (current ?? '');

  function handleChange(next) {
    setValue(next);
    setError('');
    setInfo('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!isValidImageValue(value)) {
      setError(t('imageError.invalid_url'));
      return;
    }

    setSaving(true);
    try {
      const url = await commitImage({
        value,
        previous: current,
        kind,
        save: async (next) => {
          await save(next);
          return next;
        },
      });
      setValue(url ?? '');
      setInfo(t('image.saved'));
    } catch (err) {
      console.error(err);
      setError(t(imageErrorKey(err) ?? 'image.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <fieldset>
        <legend className="sr-only">{label}</legend>
        <ImageInput kind={kind} value={value} onChange={handleChange} renderPreview={renderPreview} />
      </fieldset>

      {error && <p className="text-sm text-danger">{error}</p>}
      {info && (
        <p role="status" className="text-sm text-accent-400">
          {info}
        </p>
      )}

      {changed && (
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? t('common.pleaseWait') : t('image.save')}
          </button>
          <button type="button" disabled={saving} onClick={() => handleChange(current ?? '')} className={secondaryButtonClass}>
            {t('common.cancel')}
          </button>
        </div>
      )}
    </form>
  );
}

export default SingleImageForm;
