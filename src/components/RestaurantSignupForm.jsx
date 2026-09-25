import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../context/LanguageContext';
import FormField from './FormField';
import { inputClass, isValidImageUrl, parseAmount, primaryButtonClass, textareaClass } from './formHelpers';

// Matches the restaurants_delivery_fee_range constraint (< 100).
const MAX_DELIVERY_FEE = 99.99;

const EMPTY_FORM = {
  name: '',
  cuisine: '',
  address: '',
  deliveryTime: '',
  deliveryFee: '',
  description: '',
  image: '',
};

// Registers the signed-in user's restaurant. The database sets the owner and
// keeps the restaurant unpublished until an admin approves it.
function RestaurantSignupForm({ onCreated }) {
  const { t, formatPrice } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((current) => ({ ...current, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const name = form.name.trim();
    const cuisine = form.cuisine.trim();
    const address = form.address.trim();
    const image = form.image.trim();
    const deliveryFee = form.deliveryFee.trim() === '' ? 0 : parseAmount(form.deliveryFee);

    if (!name || !cuisine || !address) {
      setError(t('partner.error.required'));
      return;
    }
    if (Number.isNaN(deliveryFee)) {
      setError(t('partner.error.amount'));
      return;
    }
    if (deliveryFee > MAX_DELIVERY_FEE) {
      setError(t('partner.error.feeRange', { max: formatPrice(MAX_DELIVERY_FEE) }));
      return;
    }
    if (!isValidImageUrl(image)) {
      setError(t('partner.error.imageUrl'));
      return;
    }

    setSubmitting(true);
    const { data, error: insertError } = await supabase
      .from('restaurants')
      .insert({
        name,
        cuisine,
        address,
        delivery_time: form.deliveryTime.trim() || null,
        delivery_fee: deliveryFee,
        description: form.description.trim() || null,
        image: image || null,
      })
      .select()
      .single();
    setSubmitting(false);

    if (insertError) {
      console.error(insertError);
      // 23505: unique violation, this user already has a restaurant (e.g. registered in another tab).
      setError(t(insertError.code === '23505' ? 'partner.signup.alreadyExists' : 'partner.error.saveFailed'));
      return;
    }
    onCreated(data);
  }

  return (
    <div className="rounded-card border border-border bg-surface/70 p-6 backdrop-blur-md sm:p-8">
      <h1 className="mb-2 font-display text-2xl font-semibold text-text">{t('partner.signup.title')}</h1>
      <p className="mb-6 text-sm text-text-muted">{t('partner.signup.intro')}</p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t('partner.field.restaurantName')} className="sm:col-span-2">
          <input
            name="restaurant-name"
            required
            maxLength={100}
            autoComplete="organization"
            value={form.name}
            onChange={update('name')}
            className={inputClass}
          />
        </FormField>

        <FormField label={t('partner.field.cuisine')}>
          <input
            name="cuisine"
            required
            maxLength={50}
            placeholder={t('partner.field.cuisinePlaceholder')}
            value={form.cuisine}
            onChange={update('cuisine')}
            className={inputClass}
          />
        </FormField>

        <FormField label={t('partner.field.deliveryTime')} optional>
          <input
            name="delivery-time"
            maxLength={30}
            placeholder={t('partner.field.deliveryTimePlaceholder')}
            value={form.deliveryTime}
            onChange={update('deliveryTime')}
            className={inputClass}
          />
        </FormField>

        <FormField label={t('partner.field.address')}>
          <input
            name="address"
            required
            maxLength={200}
            autoComplete="street-address"
            value={form.address}
            onChange={update('address')}
            className={inputClass}
          />
        </FormField>

        <FormField label={t('partner.field.deliveryFee')} hint={t('partner.field.deliveryFeeHint')}>
          <input
            name="delivery-fee"
            inputMode="decimal"
            autoComplete="off"
            placeholder={t('partner.field.amountPlaceholder')}
            value={form.deliveryFee}
            onChange={update('deliveryFee')}
            className={inputClass}
          />
        </FormField>

        <FormField label={t('partner.field.description')} optional className="sm:col-span-2">
          <textarea
            name="description"
            rows={3}
            maxLength={1000}
            value={form.description}
            onChange={update('description')}
            className={textareaClass}
          />
        </FormField>

        <FormField
          label={t('partner.field.image')}
          optional
          hint={t('partner.field.imageHint')}
          className="sm:col-span-2"
        >
          <input
            name="image"
            type="url"
            maxLength={2000}
            placeholder="https://"
            value={form.image}
            onChange={update('image')}
            className={inputClass}
          />
        </FormField>

        {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}

        <button type="submit" disabled={submitting} className={`mt-2 sm:col-span-2 ${primaryButtonClass}`}>
          {submitting ? t('common.pleaseWait') : t('partner.signup.submit')}
        </button>
      </form>
    </div>
  );
}

export default RestaurantSignupForm;
