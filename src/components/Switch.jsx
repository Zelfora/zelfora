// An on/off switch with a label next to it. The label should describe the
// "on" state (e.g. "Available"), because screen readers announce it together
// with checked or unchecked.
function Switch({ checked, onChange, label, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 text-sm text-text disabled:opacity-60 ${className}`}
    >
      <span
        className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-accent-500' : 'bg-border'}`}
      >
        <span
          className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </span>
      {label}
    </button>
  );
}

export default Switch;
