import { MarketingIcon } from './marketing-icon';

export function MobileMenu() {
  return (
    <button
      className="btn btn-icon btn-ghost mobile-only"
      type="button"
      aria-label="Open menu"
    >
      <MarketingIcon className="icon" name="menu" />
    </button>
  );
}
