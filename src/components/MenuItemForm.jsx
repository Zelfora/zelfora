import { useId, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../context/LanguageContext';
import FormField from './FormField';
import ImageInput from './ImageInput';
import { inputClass, parseAmount, primaryButtonClass, secondaryButtonClass, textareaClass } from './formHelpers';
import { commitImage, imageErrorKey, isValidImageValue } from '../services/images';

// Matches the menu_items_price_range constraint (> 0 and < 1000).
const MIN_PRICE = 0.01;
const MAX_PRICE = 999.99;

const EMPTY_FORM = { name: '', price: '', category: '', description: '', image: '' };

// Adds a dish to the owner's restaurant, or edits one when item is given.
// RLS only accepts changes to items of a restaurant the signed-in user owns.
function MenuItemForm({ restaurantId, item = null, categories, onSaved, onCancel }) {
  const { t, locale, formatPrice } = useTranslation();
  const editing = item !== null;
  const [form, setForm] = useState(() =>
    editing
      ? {
          name: item.name,
          price: new Intl.NumberFormat(locale, { minimumFractionDigits: 2, useGrouping: false }).format(item.price),
          category: item.category ?? '',
          description: item.description ?? '',
          image: item.image ?? '',
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef(null);
  const categoryListId = useId();

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
    const category = form.category.trim();
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
    if (!isValidImageValue(form.image)) {
      setError(t('imageError.invalid_url'));
      return;
    }

    const fields = { name, price, category, description: form.description.trim() || null };

    setSubmitting(true);
    try {
      const saved = await commitImage({
        value: form.image,
        previous: item?.image ?? null,
        kind: 'menuItem',
        save: async (image) => {
          const query = editing
            ? supabase.from('menu_items').update({ ...fields, image }).eq('id', item.id)
            : supabase.from('menu_items').insert({ ...fields, image, restaurant_id: restaurantId });
          // .single() also fails when RLS silently matched no row.
          const { data, error: saveError } = await query.select().single();
          if (saveError) throw saveError;
          return data;
        },
      });

      onSaved(saved);
      if (!editing) {
        // Keep the category so several dishes in a row can go into the same one.
        setForm({ ...EMPTY_FORM, category });
        setInfo(t('partner.menu.added', { name: saved.name }));
        nameRef.current?.focus();
      }
    } catch (err) {
      console.error(err);
      setError(t(imageErrorKey(err) ?? 'partner.error.saveFailed'));
    } finally {
      setSubmitting(false);
    }
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

      <FormField label={t('partner.field.image')} optional group className="sm:col-span-2">
        <ImageInput kind="menuItem" value={form.image} onChange={setImage} />
      </FormField>

      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
      {info && (
        <p role="status" className="text-sm text-accent-400 sm:col-span-2">
          {info}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={submitting} className={`flex-1 ${primaryButtonClass}`}>
          {submitting ? t('common.pleaseWait') : t(editing ? 'common.save' : 'partner.menu.add')}
        </button>
        {onCancel && (
          <button type="button" disabled={submitting} onClick={onCancel} className={secondaryButtonClass}>
            {t('common.cancel')}
          </button>
        )}
      </div>
    </form>
  );
}

export default MenuItemForm;
