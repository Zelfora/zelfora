import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import FoodImage from './FoodImage';
import { inputClass } from './formHelpers';
import { IMAGE_KINDS, imageErrorKey, imagePreviewSrc, isPendingImage, isStoredImage, prepareImage } from '../services/images';

const PREVIEW_CLASS = {
  wide: 'h-40 w-full rounded-card',
  square: 'h-24 w-24 flex-shrink-0 rounded-[calc(var(--radius-card)-0.35rem)]',
  round: 'h-24 w-24 flex-shrink-0 rounded-full',
};

// The one picker for every image on the site: upload a photo from this device
// or paste a link. value and onChange use the image values described in
// services/images.js. Picking a photo only prepares it; the upload happens
// when the form saves it with commitImage. Wrap it in <FormField group>.
function ImageInput({ kind, value, onChange, renderPreview }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(() =>
    typeof value === 'string' && value && !isStoredImage(value) ? 'link' : 'upload'
  );
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const src = imagePreviewSrc(value);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so picking the same file again still triggers a change
    if (!file) return;
    setError('');
    setProcessing(true);
    try {
      onChange(await prepareImage(file, kind));
    } catch (err) {
      console.error(err);
      setError(t(imageErrorKey(err) ?? 'imageError.unsupported'));
    } finally {
      setProcessing(false);
    }
  }

  function clear() {
    setError('');
    onChange('');
  }

  const shape = IMAGE_KINDS[kind].shape;
  let hint = t(mode === 'upload' ? 'image.uploadHint' : 'image.linkHint');
  if (isPendingImage(value)) hint = t('image.pendingHint');

  return (
    <div className={`flex gap-4 ${shape === 'wide' ? 'flex-col' : 'items-center'}`}>
      {renderPreview ? (
        renderPreview(src)
      ) : (
        <FoodImage src={src} alt={t('image.preview')} className={`object-cover ${PREVIEW_CLASS[shape]}`} />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label={t('image.source')} className="inline-flex rounded-pill border border-border p-0.5">
            {['upload', 'link'].map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => setMode(option)}
                className={`rounded-pill px-3 py-1 text-xs font-semibold transition-colors ${
                  mode === option ? 'bg-primary-500 text-white' : 'text-text-muted hover:text-text'
                }`}
              >
                {t(`image.mode.${option}`)}
              </button>
            ))}
          </div>
          {src && (
            <button type="button" onClick={clear} className="text-xs font-medium text-text-muted hover:text-danger">
              {t('image.remove')}
            </button>
          )}
        </div>

        {mode === 'upload' ? (
          <label
            className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-pill border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-primary-500 focus-within:border-primary-500 focus-within:shadow-glow ${
              processing ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            <ImagePlus size={16} className="text-primary-300" />
            {processing ? t('image.processing') : t(src ? 'image.replace' : 'image.choose')}
            <input type="file" accept="image/*" onChange={handleFile} disabled={processing} className="sr-only" />
          </label>
        ) : (
          <input
            type="url"
            aria-label={t('image.mode.link')}
            maxLength={2000}
            autoComplete="off"
            placeholder="https://"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value.trim())}
            className={inputClass}
          />
        )}

        {error ? <p className="text-xs text-danger">{error}</p> : <p className="text-xs text-text-faint">{hint}</p>}
      </div>
    </div>
  );
}

export default ImageInput;
