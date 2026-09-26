import { useEffect, useRef } from 'react';

// A dialog over the page, built on <dialog>: it keeps focus inside, gives it
// back when it closes, and closes with Escape or a click next to it. It
// animates in and out (.modal in index.css), and the page behind it doesn't
// scroll. On phones it's a sheet from the bottom, from sm up a centered card.
//
// Keep it mounted and switch open, so it can animate out: the content stays
// until the animation ends. Give the content a new key to start it afresh.
function Modal({ open, onClose, labelledBy, className = '', children }) {
  const dialogRef = useRef(null);
  const cardRef = useRef(null);
  // Only a click that also started outside the card closes the dialog, so
  // selecting text and letting go next to the card doesn't.
  const pressedOutside = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open) {
      delete dialog.dataset.closing;
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) return;

    // Play the closing animation, then close. There is none when the visitor
    // prefers reduced motion, so then it closes right away.
    dialog.dataset.closing = '';
    let cancelled = false;
    const closing = dialog
      .getAnimations({ subtree: true })
      .filter((animation) => animation.animationName?.startsWith('modal-'));
    Promise.allSettled(closing.map((animation) => animation.finished)).then(() => {
      if (cancelled) return;
      dialog.close();
      delete dialog.dataset.closing;
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function isOutside(target) {
    return !cardRef.current.contains(target);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      className="modal"
      onCancel={(e) => {
        // Escape: animate out instead of closing at once.
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        // The browser can still close it on its own (a second Escape).
        if (open) onClose();
      }}
      onPointerDown={(e) => {
        pressedOutside.current = isOutside(e.target);
      }}
      onClick={(e) => {
        if (pressedOutside.current && isOutside(e.target)) onClose();
        pressedOutside.current = false;
      }}
    >
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-6">
        <div
          ref={cardRef}
          className={`modal-card relative flex max-h-[92dvh] w-full flex-col overflow-clip rounded-t-[1.5rem] border border-border bg-surface shadow-2xl sm:max-h-[min(46rem,calc(100dvh-3rem))] sm:rounded-card ${className}`}
        >
          {children}
        </div>
      </div>
    </dialog>
  );
}

export default Modal;
