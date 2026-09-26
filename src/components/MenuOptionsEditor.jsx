import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { inputClass, secondaryButtonClass } from './formHelpers';
import {
  MAX_CHOICES,
  MAX_GROUPS,
  MAX_NAME_LENGTH,
  newOptionChoice,
  newOptionGroup,
  parseCount,
  toEditableOptions,
} from './menuOptionsForm';
import { describeRule } from '../services/menuOptions';

const iconButtonClass =
  'flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted';
const moveButtonClass = `${iconButtonClass} hover:text-primary-300`;
const removeButtonClass = `${iconButtonClass} hover:text-danger`;

// Edits the options of a dish in MenuItemForm: groups such as "Size" or
// "Extras", each with its choices and how many a customer picks. value is
// the editable form from menuOptionsForm.js. copySources are other dishes
// with options, which the owner can copy from.
function MenuOptionsEditor({ value, onChange, copySources, formatAmount }) {
  const { t } = useTranslation();
  // A group or choice that was just added gets the focus.
  const [focusId, setFocusId] = useState(null);

  function updateGroup(groupId, update) {
    onChange(value.map((group) => (group.id === groupId ? update(group) : group)));
  }

  function addGroup() {
    const group = newOptionGroup();
    setFocusId(group.id);
    onChange([...value, group]);
  }

  function moveGroup(index, by) {
    const next = [...value];
    const [group] = next.splice(index, 1);
    next.splice(index + by, 0, group);
    onChange(next);
  }

  function addChoice(groupId, afterIndex) {
    const choice = newOptionChoice();
    setFocusId(choice.id);
    updateGroup(groupId, (group) => {
      const choices = [...group.choices];
      choices.splice(afterIndex + 1, 0, choice);
      return { ...group, choices };
    });
  }

  function updateChoice(groupId, choiceId, field, text) {
    updateGroup(groupId, (group) => ({
      ...group,
      choices: group.choices.map((choice) => (choice.id === choiceId ? { ...choice, [field]: text } : choice)),
    }));
  }

  function removeChoice(groupId, choiceId) {
    updateGroup(groupId, (group) => ({ ...group, choices: group.choices.filter((choice) => choice.id !== choiceId) }));
  }

  function copyFrom(itemId) {
    const source = copySources.find((item) => item.id === itemId);
    if (!source) return;
    const copied = toEditableOptions(source.options, formatAmount, { freshIds: true });
    onChange([...value, ...copied].slice(0, MAX_GROUPS));
  }

  // Enter in an option field would save the whole dish. In a choice it adds
  // the next choice instead, like a list.
  function keepEnter(e) {
    if (e.key === 'Enter') e.preventDefault();
  }

  function addChoiceOnEnter(e, group, afterIndex) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (group.choices.length < MAX_CHOICES) addChoice(group.id, afterIndex);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">{t('partner.options.intro')}</p>

      {value.map((group, index) => (
        <div key={group.id} className="rounded-card border border-border bg-bg/40 p-4">
          <div className="flex items-end gap-1">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-text">{t('partner.options.groupName')}</span>
              <input
                autoFocus={focusId === group.id}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="off"
                placeholder={t('partner.options.groupNamePlaceholder')}
                value={group.name}
                onChange={(e) => updateGroup(group.id, (g) => ({ ...g, name: e.target.value }))}
                onKeyDown={keepEnter}
                className={inputClass}
              />
            </label>
            <div className="flex pb-0.5">
              <button
                type="button"
                onClick={() => moveGroup(index, -1)}
                disabled={index === 0}
                aria-label={t('partner.options.moveUp')}
                title={t('partner.options.moveUp')}
                className={moveButtonClass}
              >
                <ChevronUp size={18} />
              </button>
              <button
                type="button"
                onClick={() => moveGroup(index, 1)}
                disabled={index === value.length - 1}
                aria-label={t('partner.options.moveDown')}
                title={t('partner.options.moveDown')}
                className={moveButtonClass}
              >
                <ChevronDown size={18} />
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((g) => g.id !== group.id))}
                aria-label={t('partner.options.removeGroup')}
                title={t('partner.options.removeGroup')}
                className={removeButtonClass}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">{t('partner.options.min')}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_CHOICES}
                value={group.min}
                onChange={(e) => updateGroup(group.id, (g) => ({ ...g, min: e.target.value }))}
                onKeyDown={keepEnter}
                className={`w-24 ${inputClass}`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">{t('partner.options.max')}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_CHOICES}
                placeholder="∞"
                value={group.max}
                onChange={(e) => updateGroup(group.id, (g) => ({ ...g, max: e.target.value }))}
                onKeyDown={keepEnter}
                className={`w-24 ${inputClass}`}
              />
            </label>
            <RuleSummary group={group} />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex gap-2 pr-11 text-sm font-medium text-text">
              <span className="flex-1">{t('partner.options.choices')}</span>
              <span className="w-28">{t('partner.options.extraPrice')}</span>
            </div>
            <ul className="flex flex-col gap-2">
              {group.choices.map((choice, choiceIndex) => (
                <li key={choice.id} className="flex items-center gap-2">
                  <input
                    autoFocus={focusId === choice.id}
                    maxLength={MAX_NAME_LENGTH}
                    autoComplete="off"
                    aria-label={t('partner.options.choiceName', { number: choiceIndex + 1 })}
                    placeholder={choiceIndex === 0 ? t('partner.options.choicePlaceholder') : ''}
                    value={choice.name}
                    onChange={(e) => updateChoice(group.id, choice.id, 'name', e.target.value)}
                    onKeyDown={(e) => addChoiceOnEnter(e, group, choiceIndex)}
                    className={`min-w-0 flex-1 ${inputClass}`}
                  />
                  <input
                    inputMode="decimal"
                    autoComplete="off"
                    aria-label={t('partner.options.choicePrice', { number: choiceIndex + 1 })}
                    placeholder={t('partner.field.amountPlaceholder')}
                    value={choice.price}
                    onChange={(e) => updateChoice(group.id, choice.id, 'price', e.target.value)}
                    onKeyDown={(e) => addChoiceOnEnter(e, group, choiceIndex)}
                    className={`w-28 ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeChoice(group.id, choice.id)}
                    aria-label={t('partner.options.removeChoice', { number: choiceIndex + 1 })}
                    title={t('partner.options.removeChoice', { number: choiceIndex + 1 })}
                    className={removeButtonClass}
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
            {group.choices.length < MAX_CHOICES && (
              <button
                type="button"
                onClick={() => addChoice(group.id, group.choices.length - 1)}
                className="mt-2 flex cursor-pointer items-center gap-1.5 rounded-pill px-2 py-1 text-sm font-semibold text-primary-300 transition-colors hover:text-primary-400"
              >
                <Plus size={16} />
                {t('partner.options.addChoice')}
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-3">
        {value.length < MAX_GROUPS && (
          <button
            type="button"
            onClick={addGroup}
            className={`flex cursor-pointer items-center gap-2 ${secondaryButtonClass}`}
          >
            <Plus size={18} />
            {t('partner.options.addGroup')}
          </button>
        )}
        {copySources.length > 0 && value.length < MAX_GROUPS && (
          <select
            value=""
            onChange={(e) => copyFrom(e.target.value)}
            aria-label={t('partner.options.copyFrom')}
            className={`min-w-0 max-w-full cursor-pointer text-text-muted ${inputClass}`}
          >
            <option value="" disabled>
              {t('partner.options.copyFrom')}
            </option>
            {copySources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// What the customer will see, such as "Required · Choose 1", while the owner
// types the counts.
function RuleSummary({ group }) {
  const { t } = useTranslation();
  const min = parseCount(group.min, 0);
  const max = parseCount(group.max, null);
  if (Number.isNaN(min) || Number.isNaN(max) || max === 0 || (max !== null && max < min)) return null;

  return (
    <p className="pb-2.5 text-sm text-text-muted">
      <span className={min > 0 ? 'font-semibold text-accent-400' : ''}>
        {t(min > 0 ? 'options.required' : 'options.optional')}
      </span>
      {' · '}
      {describeRule({ min, max }, t)}
    </p>
  );
}

export default MenuOptionsEditor;
