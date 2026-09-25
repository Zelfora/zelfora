import { useId, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../context/LanguageContext';
import FormField from './FormField';
import { inputClass, isValidImageUrl, parseAmount, primaryButtonClass, textareaClass } from './formHelpers';

// Matches the menu_items_price_range constraint (> 0 and < 1000).
const MIN_PRICE = 0.01;
const MAX_PRICE = 999.99;

const EMPTY_FORM = { name: '', price: '', category: '', description: '', image: '' };

// Adds a dish to the owner's restaurant. RLS only accepts items for a
// restaurant the signed-in user owns.
function NewMenuItemForm({ restaurantId, categories, onAdded }) {
  const { t, formatPrice } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef(null);
  const categoryListId = useId();

  function update(field) {
    return (e) => setForm((current) => ({ ...current, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    const name = form.name.trim();
    const category = form.category.trim();
    const image = form.image.trim();
    const price = parseAmount(form.price);

    if (!name || !category) {
      setError(t('partner.error.required'));
      return;
    }
    if (Number.isNaN(price)) {
      setError(t('partner.error.amount'));
      return;
    }
    if (price < MIN_PRICE || price > MAX_PRICE) {
      setError(t('partner.error.priceRange', { min: formatPrice(MIN_PRICE), max: formatPrice(MAX_PRICE) }));
      return;
    }
    if (!isValidImageUrl(image)) {
      setError(t('partner.error.imageUrl'));
      return;
    }

    setSubmitting(true);
    const { data, error: insertError } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        name,
        price,
        category,
        description: form.description.trim() || null,
        image: image || null,
      })
      .select()
      .single();
    setSubmitting(false);

    if (insertError) {
      console.error(insertError);
      setError(t('partner.error.saveFailed'));
      return;
    }

    onAdded(data);
    // Keep the category so several dishes in a row can go into the same one.
    setForm({ ...EMPTY_FORM, category });
    setInfo(t('partner.menu.added', { name: data.name }));
    nameRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label={t('partner.field.dishName')} className="sm:col-span-2">
        <input
          ref={nameRef}
          name="dish-name"
          required
          maxLength={100}
          autoComplete="off"
          value={form.name}
          onChange={update('name')}
          className={inputClass}
        />
      </FormField>

      <FormField label={t('partner.field.price')}>
        <input
          name="price"
          required
          inputMode="decimal"
          autoComplete="off"
          placeholder={t('partner.field.amountPlaceholder')}
          value={form.price}
          onChange={update('price')}
          className={inputClass}
        />
      </FormField>

      <FormField label={t('partner.field.category')}>
        <input
          name="category"
          required
          maxLength={50}
          autoComplete="off"
          list={categoryListId}
          placeholder={t('partner.field.categoryPlaceholder')}
          value={form.category}
          onChange={update('category')}
          className={inputClass}
        />
        <datalist id={categoryListId}>
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </FormField>

      <FormField label={t('partner.field.description')} optional className="sm:col-span-2">
        <textarea
          name="description"
          rows={2}
          maxLength={500}
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
      {info && (
        <p role="status" className="text-sm text-accent-400 sm:col-span-2">
          {info}
        </p>
      )}

      <button type="submit" disabled={submitting} className={`mt-2 sm:col-span-2 ${primaryButtonClass}`}>
        {submitting ? t('common.pleaseWait') : t('partner.menu.add')}
      </button>
    </form>
  );
}

export default NewMenuItemForm;
