import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { WEEKDAYS, todayWeekday, weekdayName } from '../services/openingHours';

// A restaurant's weekly opening hours, with today highlighted.
function OpeningHoursList({ hours }) {
  const { t, locale } = useTranslation();
  const [today] = useState(todayWeekday);

  return (
    <dl className="grid max-w-xs grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      {WEEKDAYS.map((day) => {
        const period = hours[day];
        const rowClass = day === today ? 'font-semibold text-text' : 'text-text-muted';
        return (
          <div key={day} className="contents">
            <dt className={`capitalize ${rowClass}`}>{weekdayName(day, locale)}</dt>
            <dd className={rowClass}>{period ? `${period[0]} – ${period[1]}` : t('hours.closed')}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export default OpeningHoursList;
