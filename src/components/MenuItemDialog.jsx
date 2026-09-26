import { useId, useRef, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../context/LanguageContext';
import FoodImage from './FoodImage';
import Modal from './Modal';
import {
  MAX_QUANTITY,
  describeRule,
  isGroupComplete,
  isGroupFull,
  isSingleChoice,
  optionGroups,
  pickedOptions,
  sumPrices,
  toggleChoice,
} from '../services/menuOptions';

// A short shake for a required option group that still needs a choice.
const NUDGE = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px)' },
  { transform: 'translateX(5px)' },
  { transform: 'translateX(-3px)' },
  { transform: 'translateX(2px)' },
  { transform: 'translateX(0)' },
];

// The dialog that opens when a customer clicks a dish: its photo and
// description, the options to choose from, and how many to add.
// contentKey changes on every open, so each dish starts with nothing picked.
// notice is set when the restaurant can't take orders (closed, or an owner's
// preview); options can still be tried, but not added.
function MenuItemDialog({ item, restaurant, open, contentKey, notice, onClose }) {
  const titleId = useId();

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="sm:max-w-lg">
      {item && (
        <DishDetails
          key={contentKey}
          item={item}
          restaurant={restaurant}
          notice={notice}
          titleId={titleId}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function DishDetails({ item, restaurant, notice, titleId, onClose }) {
  const { t, formatPrice } = useTranslation();
  const { addItem, restaurantId: cartRestaurantId, restaurantName: cartRestaurantName } = useCart();
  const groups = optionGroups(item);
  const [picked, setPicked] = useState(() => new Set());
  const [quantity, setQuantity] = useState(1);
  // After a try to add with a required group still open, those groups show
  // in red what they need.
  const [triedToAdd, setTriedToAdd] = useState(false);
  const groupRefs = useRef(new Map());

  const soldOut = item.available === false;
  const blocked = soldOut ? t('menuItem.soldOut') : notice;
  const options = pickedOptions(groups, picked);
  const unitPrice = sumPrices([item.price, ...options.map((o) => o.price)]);
  const switching = cartRestaurantId !== null && cartRestaurantId !== restaurant.id;

  function handleAdd() {
    const incomplete = groups.filter((group) => !isGroupComplete(group, picked));
    if (incomplete.length > 0) {
      setTriedToAdd(true);
      const nodes = incomplete.map((group) => groupRefs.current.get(group.id)).filter(Boolean);
      nodes[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        nodes.forEach((node) => node.animate(NUDGE, { duration: 420, easing: 'ease-in-out' }));
      }
      return;
    }
    addItem(restaurant, item, { options, quantity });
    onClose();
  }

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('itemDialog.close')}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-bg-elevated/80 text-text shadow-lg backdrop-blur-md transition-colors hover:border-primary-500/60 hover:text-primary-300"
      >
        <X size={18} />
      </button>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {item.image && (
          <FoodImage
            src={item.image}
            alt={item.name}
            iconSize={40}
            className={`h-52 w-full object-cover sm:h-60 ${soldOut ? 'grayscale' : ''}`}
          />
        )}

        <div className={`px-5 pb-6 sm:px-6 ${item.image ? 'pt-5' : 'pt-6 pr-14'}`}>
          <h2 id={titleId} className="font-display text-2xl font-semibold text-text">
            {item.name}
          </h2>
          {item.description && <p className="mt-1.5 text-text-muted">{item.description}</p>}
          <p className="mt-2 font-semibold text-primary-300">{formatPrice(item.price)}</p>

          {groups.length > 0 && (
            <div className="mt-6 flex flex-col gap-6">
              {groups.map((group) => (
                <OptionGroup
                  key={group.id}
                  ref={(node) => {
                    if (node) groupRefs.current.set(group.id, node);
                    else groupRefs.current.delete(group.id);
                  }}
                  group={group}
                  picked={picked}
                  onToggle={(choiceId) => setPicked((current) => toggleChoice(group, current, choiceId))}
                  missing={triedToAdd && !isGroupComplete(group, picked)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-surface px-5 py-4 sm:px-6">
        {blocked ? (
          <p className="rounded-card border border-warn-400/50 bg-warn-400/10 px-4 py-3 text-sm text-text">{blocked}</p>
        ) : (
          <>
            {switching && (
              <p className="notice-flash -mx-3 -mt-1.5 mb-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-text-muted">
                {t('itemDialog.switchNotice', { current: cartRestaurantName })}
              </p>
            )}
            <div className="flex items-center gap-3">
              <QuantityStepper value={quantity} onChange={setQuantity} name={item.name} />
              <button
                type="button"
                onClick={handleAdd}
                className="flex flex-1 cursor-pointer items-center justify-between gap-3 rounded-pill bg-gradient-to-r from-primary-500 to-accent-500 px-5 py-3 font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{quantity > 1 ? t('itemDialog.addCount', { count: quantity }) : t('itemDialog.add')}</span>
                <span className="tabular-nums">{formatPrice(unitPrice * quantity)}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// One option group, such as "Size" or "Extras". Groups of exactly one are
// radio buttons, the others checkboxes. missing marks a required group the
// customer tried to skip.
function OptionGroup({ ref, group, picked, onToggle, missing }) {
  const { t, formatPrice } = useTranslation();
  const single = isSingleChoice(group);
  const full = isGroupFull(group, picked);
  const required = group.min > 0;

  return (
    <fieldset ref={ref} className="min-w-0">
      <legend className="mb-2.5 flex w-full items-center justify-between gap-3">
        <span>
          <span className="block font-display font-semibold text-text">{group.name}</span>
          <span className={`block text-sm transition-colors ${missing ? 'text-danger' : 'text-text-muted'}`}>
            {describeRule(group, t)}
          </span>
        </span>
        <span
          className={`flex-shrink-0 rounded-pill px-2.5 py-0.5 text-xs font-semibold ${
            required
              ? missing
                ? 'bg-danger/15 text-danger'
                : 'bg-accent-500/15 text-accent-400'
              : 'border border-border text-text-muted'
          }`}
        >
          {t(required ? 'options.required' : 'options.optional')}
        </span>
      </legend>

      <div className="flex flex-col gap-2">
        {group.choices.map((choice) => {
          const checked = picked.has(choice.id);
          const price = Number(choice.price);
          return (
            <label
              key={choice.id}
              className={`relative flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-primary-400 has-disabled:cursor-not-allowed has-disabled:opacity-45 ${
                checked
                  ? 'border-primary-500/70 bg-primary-500/10'
                  : missing
                    ? 'border-danger/50 bg-bg/40 hover:border-danger'
                    : 'border-border bg-bg/40 hover:border-primary-500/50'
              }`}
            >
              <input
                type={single ? 'radio' : 'checkbox'}
                name={group.id}
                checked={checked}
                disabled={!checked && full && group.max !== 1}
                onChange={() => onToggle(choice.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center border-2 transition-all duration-200 ${
                  single ? 'rounded-full' : 'rounded-md'
                } ${checked ? 'border-primary-500 bg-primary-500 text-white' : 'border-text-faint'}`}
              >
                {single ? (
                  <span className={`h-2 w-2 rounded-full bg-white transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} />
                ) : (
                  <Check
                    size={14}
                    strokeWidth={3}
                    className={`transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`}
                  />
                )}
              </span>
              <span className="flex-1 text-text">{choice.name}</span>
              {price > 0 && <span className="text-sm tabular-nums text-text-muted">+{formatPrice(price)}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function QuantityStepper({ value, onChange, name }) {
  const { t } = useTranslation();
  const buttonClass =
    'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-text transition-colors hover:bg-surface-hover hover:text-primary-300 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-text';

  return (
    <div className="flex items-center rounded-pill border border-border bg-bg/60 p-1">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label={t('cart.decrease', { name })}
        className={buttonClass}
      >
        <Minus size={16} />
      </button>
      <span aria-live="polite" className="w-7 text-center font-semibold tabular-nums text-text">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QUANTITY}
        aria-label={t('cart.increase', { name })}
        className={buttonClass}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export default MenuItemDialog;
