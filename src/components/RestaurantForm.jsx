import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../context/LanguageContext';
import FormField from './FormField';
import FormMessage from './FormMessage';
import ImageInput from './ImageInput';
import { formatAmount, inputClass, parseAmount, primaryButtonClass, textareaClass } from './formHelpers';
import { commitImage, imageErrorKey, isValidImageValue } from '../services/images';
import { updateRestaurant } from '../services/restaurants';

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

// Registers the signed-in user's restaurant, or edits its details when
// restaurant is given. When registering, the database sets the owner and keeps
// the restaurant unpublished until an admin approves it. When editing, a new
// name goes into requested_name: it waits for approval while the restaurant is
// published (see "Name changes" in restaurant_owners.sql). The photo is edited
// separately, with SingleImageForm.
function RestaurantForm({ restaurant = null, onSaved }) {
  const { t, locale, formatPrice } = useTranslation();
  const editing = restaurant !== null;
  const [form, setForm] = useState(() =>
    editing
      ? {
          ...EMPTY_FORM,
          name: restaurant.requested_name ?? restaurant.name,
          cuisine: restaurant.cuisine ?? '',
          address: restaurant.address ?? '',
          deliveryTime: restaurant.delivery_time ?? '',
          deliveryFee: Number(restaurant.delivery_fee) > 0 ? formatAmount(restaurant.delivery_fee, locale) : '',
          description: restaurant.description ?? '',
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((current) => ({ ...current, [field]: e.target.value }));
  }

  function setImage(image) {
    setForm((current) => ({ ...current, image }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    const name = form.name.trim();
    const cuisine = form.cuisine.trim();
    const address = form.address.trim();
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
    if (!editing && !isValidImageValue(form.image)) {
      setError(t('imageError.invalid_url'));
      return;
    }

    const fields = {
      cuisine,
      address,
      delivery_time: form.deliveryTime.trim() || null,
      delivery_fee: deliveryFee,
      description: form.description.trim() || null,
    };

    setSubmitting(true);
    try {
      if (editing) {
        const data = await updateRestaurant(restaurant.id, {
          ...fields,
          // Asking for the current name withdraws a pending request.
          requested_name: name === restaurant.name ? null : name,
        });
        onSaved(data);
        setInfo(t(data.requested_name ? 'partner.details.savedPendingName' : 'partner.details.saved'));
      } else {
        const created = await commitImage({
          value: form.image,
          kind: 'restaurantCover',
          save: async (image) => {
            const { data, error: insertError } = await supabase
              .from('restaurants')
              .insert({ ...fields, name, image })
              .select('*, is_open')
              .single();
            if (insertError) throw insertError;
            return data;
          },
        });
        onSaved(created);
      }
    } catch (err) {
      console.error(err);
      // 23505: unique violation, this user already has a restaurant (e.g. registered in another tab).
      setError(t(imageErrorKey(err) ?? (err.code === '23505' ? 'partner.signup.alreadyExists' : 'partner.error.saveFailed')));
    } finally {
      setSubmitting(false);
    }
  }

  let nameHint;
  if (editing && restaurant.requested_name) {
    nameHint = t('partner.field.namePending', { name: restaurant.name });
  } else if (editing && restaurant.published) {
    nameHint = t('partner.field.nameApprovalHint');
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label={t('partner.field.restaurantName')} hint={nameHint} className="sm:col-span-2">
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

      {!editing && (
        <FormField label={t('partner.field.image')} optional group className="sm:col-span-2">
          <ImageInput kind="restaurantCover" value={form.image} onChange={setImage} />
        </FormField>
      )}

      <FormMessage error={error} info={info} className="sm:col-span-2" />

      <button type="submit" disabled={submitting} className={`mt-2 sm:col-span-2 ${primaryButtonClass}`}>
        {submitting ? t('common.pleaseWait') : t(editing ? 'common.save' : 'partner.signup.submit')}
      </button>
    </form>
  );
}

export default RestaurantForm;
