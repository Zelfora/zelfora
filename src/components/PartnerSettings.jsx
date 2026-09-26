import { useTranslation } from '../context/LanguageContext';
import OpeningHoursForm from './OpeningHoursForm';
import RestaurantForm from './RestaurantForm';
import SingleImageForm from './SingleImageForm';
import { cardClass } from './formHelpers';
import { updateRestaurant } from '../services/restaurants';

// The portal's Settings tab: the restaurant's details, opening hours and photo.
function PartnerSettings({ restaurant, onRestaurantChange }) {
  const { t } = useTranslation();

  async function saveRestaurantImage(image) {
    onRestaurantChange(await updateRestaurant(restaurant.id, { image }));
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-semibold text-text">{t('partner.details.title')}</h2>
        <RestaurantForm restaurant={restaurant} onSaved={onRestaurantChange} />
      </section>

      <section className={cardClass}>
        <h2 className="mb-1 font-display text-lg font-semibold text-text">{t('hours.title')}</h2>
        <p className="mb-4 text-sm text-text-muted">{t('hours.intro')}</p>
        <OpeningHoursForm restaurant={restaurant} onSaved={onRestaurantChange} />
      </section>

      <section className={cardClass}>
        <h2 className="mb-1 font-display text-lg font-semibold text-text">{t('partner.photo.title')}</h2>
        <p className="mb-4 text-sm text-text-muted">{t('partner.photo.intro')}</p>
        <SingleImageForm
          kind="restaurantCover"
          label={t('partner.photo.title')}
          current={restaurant.image}
          save={saveRestaurantImage}
        />
      </section>
    </div>
  );
}

export default PartnerSettings;
