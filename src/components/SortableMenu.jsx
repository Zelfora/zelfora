import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  defaultDropAnimationSideEffects,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import FoodImage from './FoodImage';

// dnd-kit handles the pointer, touch and keyboard input, the floating copy
// under the pointer and scrolling near the screen edges. Where the dragged
// dish or category lands is worked out here, from the middles of the rows
// and headers it passes, and the list is reordered live so the empty spot
// always shows where it will be dropped.

const SLIDE_MS = 200; // rows and headers sliding to a new place
const DROP_MS = 220; // the floating copy settling into its place
const EASING = 'cubic-bezier(0.2, 0, 0, 1)';

// Keeps a row moved with the keyboard clear of the sticky navbar.
const SCROLL_MARGIN_TOP = 96;
const SCROLL_MARGIN_BOTTOM = 24;

const pointerOptions = { activationConstraint: { distance: 4 } };
const modifiers = [({ transform }) => ({ ...transform, x: 0 })]; // up and down only

const dropAnimation = {
  duration: DROP_MS,
  easing: EASING,
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0' } },
    className: { dragOverlay: 'drag-dropping' },
  }),
};

// Announcements go through our own live region (see announce below).
const silentAnnouncements = {
  onDragStart() {},
  onDragMove() {},
  onDragOver() {},
  onDragEnd() {},
  onDragCancel() {},
};

const handleClass =
  'flex h-10 w-7 flex-shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-full text-text-faint transition-colors [-webkit-touch-callout:none] hover:bg-surface-hover hover:text-primary-300 focus-visible:text-primary-300';
// The empty spot where the dragged row will land.
const placeholderClass = 'bg-primary-500/5 outline-2 outline-dashed outline-primary-500/60';
// A row moved with the keyboard stays visible and is lifted in place.
const liftedClass = 'relative z-10 bg-surface shadow-glow ring-2 ring-primary-500';
const overlayClass = 'drag-lift h-full rounded-card bg-surface shadow-glow-lg ring-2 ring-primary-500/60';
const countClass = 'rounded-pill bg-primary-500/10 px-2 py-0.5 text-xs font-semibold text-primary-300';

const groupOf = (item) => item.category ?? '';
const categoryId = (group) => `category:${group}`;

// The menu as customers see it: category by category, in the order of each
// category's first dish. Items added by an admin may have no category; they're
// grouped under "Other" ('').
function toSections(menu) {
  const sections = new Map();
  for (const item of menu) {
    const group = groupOf(item);
    if (!sections.has(group)) sections.set(group, { group, itemIds: [] });
    sections.get(group).itemIds.push(item.id);
  }
  return [...sections.values()];
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Where an element sits in the list's layout, ignoring transforms such as the
// slide animations. The list is positioned, so it is the offsetParent.
function layoutTop(element, list) {
  let top = 0;
  for (let node = element; node && node !== list; node = node.offsetParent) top += node.offsetTop;
  return top;
}

function viewportTop(element, list) {
  return list.getBoundingClientRect().top + layoutTop(element, list);
}

// Every row and header in the list by its id (data-slide).
function slideElements(list) {
  const elements = new Map();
  for (const element of list.querySelectorAll('[data-slide]')) elements.set(element.dataset.slide, element);
  return elements;
}

// While a category is dragged, the categories fold up to just their headers,
// which moves the dragged header up. This returns a top padding that keeps it
// where it was, under the pointer, and a minimum height so the page doesn't
// get shorter and scroll.
function foldAround(list, group) {
  const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
  let foldedTop = 0;
  for (const header of list.querySelectorAll('[data-category-header]')) {
    if (header.dataset.categoryHeader === group) {
      return { paddingTop: layoutTop(header, list) - foldedTop, minHeight: list.offsetHeight };
    }
    foldedTop += header.offsetHeight + gap;
  }
  return null;
}

// Lets rows and headers slide to their new place instead of jumping. Call the
// returned capture() right before a state change that moves them.
function useSlide(listRef) {
  const before = useRef(null);
  const running = useRef(new WeakMap());

  useLayoutEffect(() => {
    const positions = before.current;
    before.current = null;
    if (!positions || !listRef.current) return;
    for (const [id, element] of slideElements(listRef.current)) {
      running.current.get(element)?.cancel();
      const from = positions.get(id);
      // Skip new elements and the rows hidden while the categories are folded.
      if (from === undefined || element.offsetParent === null) continue;
      const offset = from - element.getBoundingClientRect().top;
      if (Math.abs(offset) < 1) continue;
      const animation = element.animate([{ transform: `translateY(${offset}px)` }, { transform: 'none' }], {
        duration: SLIDE_MS,
        easing: EASING,
      });
      running.current.set(element, animation);
    }
  });

  return useCallback(() => {
    if (!listRef.current || prefersReducedMotion()) return;
    const positions = new Map();
    for (const [id, element] of slideElements(listRef.current)) {
      if (element.offsetParent !== null) positions.set(id, element.getBoundingClientRect().top);
    }
    before.current = positions;
  }, [listRef]);
}

// The owner's menu, grouped by category, with drag handles to reorder the
// dishes and the categories. A dish dragged into another category moves to
// that category. onReorder(items, moved) receives the whole menu in its new
// order, and moved = { id, category } when a dish changed category.
// renderItem(item, handle) renders one dish with the given drag handle.
function SortableMenu({ menu, onReorder, renderItem }) {
  const { t } = useTranslation();
  const listRef = useRef(null);
  // While dragging: the menu as it will be after the drop. A category the
  // last dish was dragged out of stays in it, so the list doesn't jump.
  const [draft, setDraft] = useState(null);
  // What is being dragged: { type: 'item' | 'category', id, group, name, keyboard }.
  const [drag, setDrag] = useState(null);
  const [animateDrop, setAnimateDrop] = useState(true);
  // { paddingTop, minHeight } while the categories are folded.
  const [fold, setFold] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const unfoldTimer = useRef(null);
  const unfoldAnchor = useRef(null);
  const keyboardStep = useRef(null);

  const itemsById = useMemo(() => new Map(menu.map((item) => [item.id, item])), [menu]);
  const saved = useMemo(() => toSections(menu), [menu]);
  const sections = draft ?? saved;

  const keyboardOptions = useMemo(
    () => ({
      // The arrow keys move the dragged row one place at a time. The row itself
      // moves (there's no floating copy), so the coordinates stay the same.
      coordinateGetter(event) {
        if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
          event.preventDefault();
          keyboardStep.current?.(event.code === 'ArrowUp' ? -1 : 1);
        } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
          event.preventDefault();
        }
        return undefined;
      },
    }),
    []
  );
  const sensors = useSensors(useSensor(PointerSensor, pointerOptions), useSensor(KeyboardSensor, keyboardOptions));

  useEffect(() => {
    const timer = unfoldTimer;
    return () => {
      clearTimeout(timer.current);
      document.documentElement.classList.remove('is-dragging');
    };
  }, []);

  // After unfolding, scroll so the dragged category stays where it was on
  // screen and its dishes unfold around it. Runs before the slide animations
  // measure where everything ended up.
  useLayoutEffect(() => {
    const anchor = unfoldAnchor.current;
    if (fold || !anchor) return;
    unfoldAnchor.current = null;
    const header = slideElements(listRef.current).get(categoryId(anchor.group));
    if (header) window.scrollBy(0, viewportTop(header, listRef.current) - anchor.top);
  }, [fold]);

  const captureLayout = useSlide(listRef);

  const sectionName = (group) => group || t('partner.menu.uncategorized');

  // "Other" only takes back its own dishes; the owner's form always asks for
  // a category.
  function itemTargets() {
    return sections.filter((section) => section.group !== '' || section.group === drag.group);
  }

  // The place under the middle of the dragged dish: the category whose header
  // middle it has passed, then after every dish whose middle it has passed.
  function itemPlaceAt(y) {
    const list = listRef.current;
    const elements = slideElements(list);
    const middle = (id) => {
      const element = elements.get(id);
      return viewportTop(element, list) + element.offsetHeight / 2;
    };
    const targets = itemTargets();
    let target = targets[0];
    for (const section of targets) {
      if (middle(categoryId(section.group)) <= y) target = section;
    }
    const others = target.itemIds.filter((id) => id !== drag.id && elements.has(id));
    return { group: target.group, index: others.filter((id) => middle(id) < y).length };
  }

  function categoryPlaceAt(y) {
    const list = listRef.current;
    const elements = slideElements(list);
    return sections.filter((section) => {
      if (section.group === drag.group) return false;
      const header = elements.get(categoryId(section.group));
      return viewportTop(header, list) + header.offsetHeight / 2 < y;
    }).length;
  }

  // Moves the dragged dish to position index (counted without the dish
  // itself) in category group.
  function moveItem({ group, index }) {
    const current = sections.find((section) => section.itemIds.includes(drag.id));
    if (current.group === group && current.itemIds.indexOf(drag.id) === index) return;
    captureLayout();
    let total = 0;
    setDraft(
      sections.map((section) => {
        const others = section.itemIds.filter((id) => id !== drag.id);
        if (section.group !== group) return { ...section, itemIds: others };
        total = others.length + 1;
        return { ...section, itemIds: [...others.slice(0, index), drag.id, ...others.slice(index)] };
      })
    );
    setAnnouncement(
      t('partner.menu.movedDish', { name: drag.name, position: index + 1, total, category: sectionName(group) })
    );
  }

  function moveCategory(index) {
    const current = sections.findIndex((section) => section.group === drag.group);
    if (current === index) return;
    captureLayout();
    const others = sections.filter((section) => section.group !== drag.group);
    setDraft([...others.slice(0, index), sections[current], ...others.slice(index)]);
    setAnnouncement(t('partner.menu.movedCategory', { name: drag.name, position: index + 1, total: sections.length }));
  }

  function step(direction) {
    if (!drag) return;
    if (drag.type === 'category') {
      const index = sections.findIndex((section) => section.group === drag.group) + direction;
      if (index >= 0 && index < sections.length) moveCategory(index);
      return;
    }
    const targets = itemTargets();
    const at = targets.findIndex((section) => section.itemIds.includes(drag.id));
    const index = targets[at].itemIds.indexOf(drag.id) + direction;
    const next = targets[at + direction];
    if (index >= 0 && index < targets[at].itemIds.length) {
      moveItem({ group: targets[at].group, index });
    } else if (next) {
      // Past the first or last dish: on to the end or start of the next category.
      moveItem({ group: next.group, index: direction < 0 ? next.itemIds.length : 0 });
    }
  }

  // Keyboard moves: moving a row in the DOM drops its focus, so give it back
  // to the handle, and keep the row in view.
  useLayoutEffect(() => {
    keyboardStep.current = step;
    if (!drag?.keyboard) return;
    const list = listRef.current;
    const element = slideElements(list).get(drag.id);
    if (!element) return;
    element.querySelector('[data-drag-handle]')?.focus({ preventScroll: true });
    const top = viewportTop(element, list);
    const bottom = top + element.offsetHeight;
    if (top < SCROLL_MARGIN_TOP) {
      window.scrollBy({ top: top - SCROLL_MARGIN_TOP, behavior: 'smooth' });
    } else if (bottom > window.innerHeight - SCROLL_MARGIN_BOTTOM) {
      window.scrollBy({ top: bottom - window.innerHeight + SCROLL_MARGIN_BOTTOM, behavior: 'smooth' });
    }
  });

  function handleDragStart({ active, activatorEvent }) {
    clearTimeout(unfoldTimer.current);
    const { type, group } = active.data.current;
    const keyboard = activatorEvent?.type === 'keydown';
    const name = type === 'item' ? itemsById.get(active.id).name : sectionName(group);
    captureLayout();
    if (type === 'category') setFold(foldAround(listRef.current, group));
    setDraft(saved);
    setDrag({ type, id: active.id, group, name, keyboard });
    setAnimateDrop(!keyboard && !prefersReducedMotion());
    if (!keyboard) document.documentElement.classList.add('is-dragging');
    setAnnouncement(t('partner.menu.pickedUp', { name }));
  }

  function handleDragMove({ active }) {
    const rect = active.rect.current.translated;
    if (!drag || drag.keyboard || !rect) return;
    const y = rect.top + rect.height / 2;
    if (drag.type === 'item') moveItem(itemPlaceAt(y));
    else moveCategory(categoryPlaceAt(y));
  }

  function endDrag() {
    document.documentElement.classList.remove('is-dragging');
    captureLayout();
    setDraft(null);
    setDrag(null);
    // Unfold once the dropped header has settled into its place.
    if (drag.type === 'category') {
      const { group } = drag;
      unfoldTimer.current = setTimeout(() => {
        const header = slideElements(listRef.current).get(categoryId(group));
        unfoldAnchor.current = header ? { group, top: viewportTop(header, listRef.current) } : null;
        captureLayout();
        setFold(null);
      }, DROP_MS);
    }
  }

  function handleDragEnd() {
    if (!drag) return;
    endDrag();
    setAnnouncement(t('partner.menu.dropped', { name: drag.name }));

    let moved = null;
    const items = draft.flatMap(({ group, itemIds }) =>
      itemIds
        .map((id) => itemsById.get(id))
        .filter(Boolean)
        .map((item) => {
          if (groupOf(item) === group) return item;
          moved = { id: item.id, category: group || null };
          return { ...item, category: group || null };
        })
    );
    const before = saved.flatMap((section) => section.itemIds);
    if (moved || items.length !== before.length || items.some((item, index) => item.id !== before[index])) {
      onReorder(items, moved);
    }
  }

  function handleDragCancel() {
    if (!drag) return;
    endDrag();
    setAnnouncement(t('partner.menu.dragCancelled', { name: drag.name }));
  }

  // How the dragged row or header looks in the list.
  function dragMode(id) {
    if (drag?.id !== id) return null;
    return drag.keyboard ? 'lifted' : 'placeholder';
  }

  const canDragItems = menu.length > 1;
  const canDragCategories = saved.length > 1;

  let overlay = null;
  if (drag && !drag.keyboard && drag.type === 'item') {
    const item = itemsById.get(drag.id);
    overlay = (
      <div className={overlayClass}>
        <div inert className="h-full">
          {renderItem(
            item,
            <span className={handleClass}>
              <GripVertical size={18} />
            </span>
          )}
        </div>
      </div>
    );
  } else if (drag && !drag.keyboard) {
    const itemIds = sections.find((section) => section.group === drag.group)?.itemIds ?? [];
    const photos = itemIds.map((id) => itemsById.get(id)).filter((item) => item?.image);
    overlay = (
      <div className={`${overlayClass} flex items-center gap-2 pr-2`}>
        <span className={handleClass}>
          <GripVertical size={18} />
        </span>
        <h3 className="truncate font-display font-semibold text-primary-300">{drag.name}</h3>
        <span className={countClass}>{itemIds.length}</span>
        <span className="ml-auto flex -space-x-2">
          {photos.slice(0, 3).map((item) => (
            <FoodImage
              key={item.id}
              src={item.image}
              alt=""
              iconSize={12}
              className="h-7 w-7 rounded-full border-2 border-surface object-cover"
            />
          ))}
        </span>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      modifiers={modifiers}
      accessibility={{
        announcements: silentAnnouncements,
        screenReaderInstructions: { draggable: t('partner.menu.dragInstructions') },
      }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div ref={listRef} style={fold ?? undefined} className="relative flex flex-col gap-6 [overflow-anchor:none]">
        {sections.map(({ group, itemIds }) => {
          const items = itemIds.map((id) => itemsById.get(id)).filter(Boolean);
          return (
            <div key={group}>
              <CategoryHeader
                group={group}
                name={sectionName(group)}
                count={items.length}
                canDrag={canDragCategories}
                mode={dragMode(categoryId(group))}
              />
              <ul hidden={fold !== null} className="drag-fade-in mt-2 flex flex-col gap-2">
                {items.map((item) => (
                  <DraggableItem
                    key={item.id}
                    item={item}
                    group={group}
                    canDrag={canDragItems}
                    mode={dragMode(item.id)}
                    renderItem={renderItem}
                  />
                ))}
              </ul>
              {items.length === 0 && fold === null && (
                <p className="drag-fade-in mt-2 rounded-card border border-dashed border-border px-4 py-3 text-sm text-text-faint">
                  {t('partner.menu.emptyCategory')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* In a portal: the card's backdrop blur would otherwise position the
          fixed overlay relative to the card instead of the screen. */}
      {createPortal(
        <DragOverlay dropAnimation={animateDrop ? dropAnimation : null}>
          {/* dnd-kit measures this wrapper to aim the drop, so it must not
              be scaled by the lift inside it. */}
          {overlay && <div className="h-full">{overlay}</div>}
        </DragOverlay>,
        document.body
      )}

      <p aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </DndContext>
  );
}

// A row or header that is dragged by its handle. Returns the callback ref for
// the element that moves, and the handle to show in it (null if it can't be
// dragged).
function useDragHandle({ id, data, canDrag, label }) {
  const { t } = useTranslation();
  const {
    setNodeRef: attachNode,
    setActivatorNodeRef: attachHandle,
    attributes,
    listeners,
  } = useDraggable({
    id,
    data,
    disabled: !canDrag,
    attributes: { roleDescription: t('partner.menu.draggable') },
  });

  const handle = canDrag ? (
    <button
      type="button"
      ref={attachHandle}
      {...attributes}
      {...listeners}
      data-drag-handle
      aria-label={label}
      title={t('partner.menu.dragHint')}
      className={handleClass}
    >
      <GripVertical size={18} />
    </button>
  ) : null;
  return { attachNode, handle };
}

// mode is 'placeholder' while it's dragged with the pointer (a floating copy
// follows the pointer), 'lifted' while it's moved with the keyboard.
function CategoryHeader({ group, name, count, canDrag, mode }) {
  const { t } = useTranslation();
  const { attachNode, handle } = useDragHandle({
    id: categoryId(group),
    data: { type: 'category', group },
    canDrag,
    label: t('partner.menu.dragCategory', { name }),
  });

  return (
    <div
      ref={attachNode}
      data-slide={categoryId(group)}
      data-category-header={group}
      className={`flex min-h-10 scroll-mt-24 items-center rounded-card ${
        mode === 'placeholder' ? placeholderClass : mode === 'lifted' ? liftedClass : ''
      }`}
    >
      <div className={`flex min-w-0 flex-1 items-center gap-2 ${mode === 'placeholder' ? 'invisible' : ''}`}>
        {handle}
        <h3 className="truncate font-display font-semibold text-primary-300">{name}</h3>
        <span className={countClass}>{count}</span>
      </div>
    </div>
  );
}

function DraggableItem({ item, group, canDrag, mode, renderItem }) {
  const { t } = useTranslation();
  const { attachNode, handle } = useDragHandle({
    id: item.id,
    data: { type: 'item', group },
    canDrag,
    label: t('partner.menu.dragDish', { name: item.name }),
  });

  return (
    <li
      ref={attachNode}
      data-slide={item.id}
      className={`scroll-mt-24 rounded-card ${
        mode === 'placeholder' ? placeholderClass : mode === 'lifted' ? liftedClass : ''
      }`}
    >
      <div className={mode === 'placeholder' ? 'invisible' : undefined}>{renderItem(item, handle)}</div>
    </li>
  );
}

export default SortableMenu;
