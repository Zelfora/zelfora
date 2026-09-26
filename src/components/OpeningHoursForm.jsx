import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import FormMessage from './FormMessage';
import { inputClass, primaryButtonClass } from './formHelpers';
import { WEEKDAYS, isValidTime, weekdayName } from '../services/openingHours';
import { updateRestaurant } from '../services/restaurants';

const DEFAULT_PERIOD = ['12:00', '22:00'];

// One row per weekday, from the stored hours (see services/openingHours.js).
function toDays(hours) {
  return Object.fromEntries(
    WEEKDAYS.map((day) => {
      const period = hours?.[day];
      return [day, { open: hours ? Boolean(period) : true, opens: period?.[0] ?? DEFAULT_PERIOD[0], closes: period?.[1] ?? DEFAULT_PERIOD[1] }];
    })
  );
}

// Sets the restaurant's weekly opening hours, or none at all (then it takes
// orders whenever accepting_orders is on). The database checks them against
// the current time when an order comes in.
function OpeningHoursForm({ restaurant, onSaved }) {
  const { t, locale } = useTranslation();
  const [useHours, setUseHours] = useState(restaurant.opening_hours !== null);
  const [days, setDays] = useState(() => toDays(restaurant.opening_hours));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);

  function updateDay(day, changes) {
    setDays((current) => ({ ...current, [day]: { ...current[day], ...changes } }));
    setInfo('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    let hours = null;
    if (useHours) {
      hours = {};
      for (const day of WEEKDAYS) {
        const { open, opens, closes } = days[day];
        if (!open) continue;
        if (!isValidTime(opens) || !isValidTime(closes)) {
          setError(t('hours.error.invalid', { day: weekdayName(day, locale) }));
          return;
        }
        if (opens === closes) {
          setError(t('hours.error.same', { day: weekdayName(day, locale) }));
          return;
        }
        hours[day] = [opens, closes];
      }
    }

    setSaving(true);
    try {
      onSaved(await updateRestaurant(restaurant.id, { opening_hours: hours }));
      setInfo(t('hours.saved'));
    } catch (err) {
      console.error(err);
      setError(t('partner.error.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2 text-sm text-text">
        <legend className="sr-only">{t('hours.title')}</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="use-hours" className="accent-primary-500" checked={!useHours} onChange={() => setUseHours(false)} />
          {t('hours.none')}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="use-hours" className="accent-primary-500" checked={useHours} onChange={() => setUseHours(true)} />
          {t('hours.fixed')}
        </label>
      </fieldset>

      {useHours && (
        <div className="flex flex-col gap-3">
          {WEEKDAYS.map((day) => {
            const { open, opens, closes } = days[day];
            const dayName = weekdayName(day, locale);
            return (
              <div key={day} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex w-36 items-center gap-2 text-sm text-text">
                  <input type="checkbox" className="accent-primary-500" checked={open} onChange={(e) => updateDay(day, { open: e.target.checked })} />
                  <span className="capitalize">{dayName}</span>
                </label>
                {open ? (
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <input
                      type="time"
                      required
                      aria-label={t('hours.opens', { day: dayName })}
                      value={opens}
                      onChange={(e) => updateDay(day, { opens: e.target.value })}
                      className={inputClass}
                    />
                    {t('hours.until')}
                    <input
                      type="time"
                      required
                      aria-label={t('hours.closes', { day: dayName })}
                      value={closes}
                      onChange={(e) => updateDay(day, { closes: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-text-faint">{t('hours.closed')}</span>
                )}
              </div>
            );
          })}
          <p className="text-xs text-text-faint">{t('hours.midnightHint')}</p>
        </div>
      )}

      <FormMessage error={error} info={info} />

      <button type="submit" disabled={saving} className={`self-start ${primaryButtonClass}`}>
        {saving ? t('common.pleaseWait') : t('hours.save')}
      </button>
    </form>
  );
}

export default OpeningHoursForm;
