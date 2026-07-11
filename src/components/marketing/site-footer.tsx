import { marketingContent } from '@/data/marketing';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <a className="brand" href="#product" aria-label="Gleen home">
              <span className="brand-mark" aria-hidden="true" />
              <span>Gleen</span>
            </a>
            <p>One video enters. A spectrum of usable knowledge comes out.</p>
          </div>
          {marketingContent.footerGroups.map((group) => (
            <div key={group.title}>
              <div className="footer-title">{group.title}</div>
              <div className="footer-links">
                {group.links.map((link) => (
                  <a href={link.href} key={link.label}>
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2026 Gleen. All rights reserved.</span>
          <span>
            AI-generated content should be checked against the original source.
          </span>
        </div>
      </div>
    </footer>
  );
}
