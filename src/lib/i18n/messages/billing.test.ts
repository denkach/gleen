import { describe, expect, it } from 'vitest';

import { supportedLocales } from '../locales';
import { billingMessages } from './billing';

describe('billingMessages', () => {
  it('provides the complete billing namespace for every supported locale', () => {
    expect(Object.keys(billingMessages).sort()).toEqual(
      [...supportedLocales].sort(),
    );

    for (const locale of supportedLocales) {
      expect(billingMessages[locale].subscription.title).not.toHaveLength(0);
      expect(billingMessages[locale].checkout.actions.retry).not.toHaveLength(
        0,
      );
      expect(
        billingMessages[locale].usage.filters.searchLabel,
      ).not.toHaveLength(0);
      expect(
        billingMessages[locale].invoices.empty.filteredTitle,
      ).not.toHaveLength(0);
      expect(
        billingMessages[locale].portal.actions.managePlan,
      ).not.toHaveLength(0);
      expect(
        billingMessages[locale].limitReached.actions.openLedger,
      ).not.toHaveLength(0);
      expect(billingMessages[locale].navigation.mobileLabel).not.toHaveLength(
        0,
      );
    }
  });

  it('localizes representative billing states and preserves supplied data', () => {
    expect(billingMessages.de.subscription.title).toBe('Abonnement');
    expect(billingMessages.es.checkout.actions.submit('Prism Pro')).toBe(
      'Contratar Prism Pro',
    );
    expect(billingMessages.uk.invoices.actions.downloadPdf('GLEEN-1042')).toBe(
      'Завантажити PDF GLEEN-1042',
    );
    expect(billingMessages.ru.presentation.usage.event.reservation).toBe(
      'Зарезервировано',
    );
    expect(
      billingMessages.en.portal.scheduled.downgrade(
        'Starter',
        '1 August 2026',
        'Prism Pro',
      ),
    ).toContain('Starter');
  });
});
