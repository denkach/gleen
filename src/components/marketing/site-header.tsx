import { marketingContent } from '@/data/marketing';

import { MarketingIcon } from './marketing-icon';
import { MobileMenu } from './mobile-menu';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="#product" aria-label="Gleen home">
          <span className="brand-mark" aria-hidden="true" />
          <span>Gleen</span>
        </a>
        <nav
          className="header-nav desktop-only"
          aria-label="Primary navigation"
        >
          {marketingContent.navigation.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <a className="btn btn-ghost btn-sm language-btn" href="#product">
            EN <MarketingIcon className="icon icon-sm" name="chevron" />
          </a>
          <a className="btn btn-ghost btn-sm desktop-only" href="#product">
            Sign in
          </a>
          <a className="btn btn-primary btn-sm" href="#product">
            Start free <MarketingIcon className="icon icon-sm" name="arrow" />
          </a>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
