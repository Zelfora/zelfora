import { useEffect, useRef, useState } from 'react';

// Open state for a menu that drops down from a navbar button. Put
// containerRef on the element around the button and the menu, and buttonRef
// on the button.
//
// Any interaction elsewhere closes it: a press outside it (with touch this
// fires as soon as the finger lands, also when it goes on to scroll), any
// scrolling, or focus moving away. Escape closes it too, and puts the focus
// back on the button if it was in the menu.
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function closeIfOutside(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }
    function close() {
      setOpen(false);
    }
    function handleKey(e) {
      if (e.key !== 'Escape') return;
      if (containerRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
      setOpen(false);
    }

    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('focusin', closeIfOutside);
    // Scroll events don't bubble; capturing also catches scrolling panels.
    document.addEventListener('scroll', close, { capture: true, passive: true });
    // Also when the page is already at its end and doesn't move.
    window.addEventListener('wheel', close, { passive: true });
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('focusin', closeIfOutside);
      document.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('wheel', close);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return { open, setOpen, containerRef, buttonRef };
}
