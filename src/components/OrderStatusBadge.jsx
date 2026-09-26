import { useTranslation } from '../context/LanguageContext';

const DOT_CLASS = {
  placed: 'bg-warn-400',
  preparing: 'bg-primary-400',
  delivering: 'bg-accent-400',
  delivered: 'bg-text-faint',
  cancelled: 'bg-danger',
};

// An order's status as a small pill, for customers and restaurant owners.
function OrderStatusBadge({ status }) {
  const { t, has } = useTranslation();
  const key = `orders.status.${status}`;

  return (
    <span className="inline-flex flex-shrink-0 items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1 text-xs font-semibold text-text">
      <span className={`h-2 w-2 rounded-full ${DOT_CLASS[status] ?? 'bg-text-faint'}`} />
      {has(key) ? t(key) : status}
    </span>
  );
}

export default OrderStatusBadge;
