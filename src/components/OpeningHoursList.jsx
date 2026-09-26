import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { WEEKDAYS, currentHoursDay, weekdayName } from '../services/openingHours';

// A restaurant's weekly opening hours, with the day whose hours apply right now
// highlighted. After midnight that can still be yesterday, marked "now" so it
// doesn't look like a mistake.
function OpeningHoursList({ hours }) {
  const { t, locale } = useTranslation();
  const [current] = useState(() => currentHoursDay(hours));

  return (
    <dl className="grid max-w-xs grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      {WEEKDAYS.map((day) => {
        const period = hours[day];
        const rowClass = day === current.day ? 'font-semibold text-text' : 'text-text-muted';
        return (
          <div key={day} className="contents">
            <dt className={`capitalize ${rowClass}`}>{weekdayName(day, locale)}</dt>
            <dd className={rowClass}>
              {period ? `${period[0]} – ${period[1]}` : t('hours.closed')}
              {day === current.day && current.pastMidnight && (
                <span className="ml-2 rounded-pill bg-accent-500/15 px-2 py-0.5 text-xs font-semibold text-accent-400">
                  {t('hours.now')}
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export default OpeningHoursList;
