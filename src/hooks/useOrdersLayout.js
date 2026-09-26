import { useState } from 'react';

const STORAGE_KEY = 'zelfora.partner.orders';
const VIEWS = ['list', 'tiles'];
// The completed orders matter least, so they start folded.
const DEFAULT_LAYOUT = { view: 'list', collapsed: ['history'] };

function readLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      view: VIEWS.includes(saved?.view) ? saved.view : DEFAULT_LAYOUT.view,
      collapsed: Array.isArray(saved?.collapsed) ? saved.collapsed : DEFAULT_LAYOUT.collapsed,
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

// How the owner likes the portal's Orders tab: as a list or as tiles, and
// which groups ('inProgress', 'history') are folded. Remembered per browser.
export function useOrdersLayout() {
  const [layout, setLayout] = useState(readLayout);

  function save(next) {
    setLayout(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Not remembered, but it still applies until the page is closed.
    }
  }

  function setView(view) {
    save({ ...layout, view });
  }

  function toggleGroup(group) {
    const collapsed = layout.collapsed.includes(group)
      ? layout.collapsed.filter((other) => other !== group)
      : [...layout.collapsed, group];
    save({ ...layout, collapsed });
  }

  return { ...layout, setView, toggleGroup };
}
