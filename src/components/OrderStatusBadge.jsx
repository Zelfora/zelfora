import { BellRing, Bike, ChefHat, CircleCheck, CircleX } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

// Each status has its own color and icon, so preparing and delivering orders
// are told apart at a glance. The label keeps the text color: yellow or cyan
// text would be too faint on the light theme's white.
const STATUS_STYLE = {
  placed: { Icon: BellRing, pill: 'border-warn-400/60 bg-warn-400/15', icon: 'text-warn-400' },
  preparing: { Icon: ChefHat, pill: 'border-primary-400/60 bg-primary-500/15', icon: 'text-primary-300' },
  delivering: { Icon: Bike, pill: 'border-accent-400/60 bg-accent-400/15', icon: 'text-accent-400' },
  delivered: { Icon: CircleCheck, pill: 'border-border bg-surface', icon: 'text-text-faint' },
  cancelled: { Icon: CircleX, pill: 'border-danger/50 bg-danger/10', icon: 'text-danger' },
};
const FALLBACK_STYLE = { Icon: null, pill: 'border-border bg-surface', icon: '' };

// An order's status as a small pill, for customers and restaurant owners.
function OrderStatusBadge({ status }) {
  const { t, has } = useTranslation();
  const key = `orders.status.${status}`;
  const { Icon, pill, icon } = STATUS_STYLE[status] ?? FALLBACK_STYLE;

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-pill border px-3 py-1 text-xs font-semibold text-text ${pill}`}
    >
      {Icon && <Icon size={14} strokeWidth={2.25} aria-hidden="true" className={icon} />}
      {has(key) ? t(key) : status}
    </span>
  );
}

export default OrderStatusBadge;
