import { Hero } from '@/components/marketing/hero';
import { SiteHeader } from '@/components/marketing/site-header';

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content">
        <Hero />
      </main>
    </>
  );
}
