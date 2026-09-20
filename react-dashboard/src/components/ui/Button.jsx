import { Icon } from './Icon.jsx';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const Spinner = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 animate-spin" aria-hidden="true">
    <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2.5" />
    <path
      d="M8 1.5A6.5 6.5 0 0 1 14.5 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * The app's only button.
 *
 * `loading` both disables the button and swaps its icon for a spinner, so a
 * double submit is impossible and the person can see why nothing is happening
 * yet. The label stays put rather than being replaced by "Saving…", which
 * would resize the button and shift everything next to it.
 */
export const Button = ({
  as: Component = 'button',
  variant = 'secondary',
  icon,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  // `as` lets a navigation control look identical to a button without
  // pretending to be one — a link that moves you to another page should still
  // be a link, so it opens in a new tab and shows its target on hover.
  const isButton = Component === 'button';

  return (
    <Component
      className={`${VARIANTS[variant] ?? VARIANTS.secondary} ${className}`}
      {...(isButton
        ? { type: 'button', disabled: disabled || loading, 'aria-busy': loading || undefined }
        : {})}
      {...props}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} /> : null}
      {children}
    </Component>
  );
};
