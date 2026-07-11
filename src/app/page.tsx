import { ArtifactFacets } from '@/components/marketing/artifact-facets';
import { Hero } from '@/components/marketing/hero';
import { PricingPreview } from '@/components/marketing/pricing-preview';
import { ProcessScene } from '@/components/marketing/process-scene';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content">
        <Hero />
        <ProcessScene />
        <ArtifactFacets />
        <PricingPreview />
      </main>
      <SiteFooter />
    </>
  );
}
