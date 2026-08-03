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

  it.each([
    ['en', 1, '1 invoice'],
    ['en', 2, '2 invoices'],
    ['en', 5, '5 invoices'],
    ['es', 1, '1 factura'],
    ['es', 2, '2 facturas'],
    ['es', 5, '5 facturas'],
    ['de', 1, '1 Rechnung'],
    ['de', 2, '2 Rechnungen'],
    ['de', 5, '5 Rechnungen'],
    ['uk', 1, '1 рахунок'],
    ['uk', 2, '2 рахунки'],
    ['uk', 5, '5 рахунків'],
    ['uk', 21, '21 рахунок'],
    ['ru', 1, '1 счёт'],
    ['ru', 2, '2 счёта'],
    ['ru', 5, '5 счетов'],
    ['ru', 21, '21 счёт'],
  ] as const)('pluralizes %s invoice count %d', (locale, count, expected) => {
    expect(billingMessages[locale].invoices.metrics.invoiceCount(count)).toBe(
      expected,
    );
  });

  it.each([
    ['en', 1, 'Resets in 1 day on DATE'],
    ['en', 2, 'Resets in 2 days on DATE'],
    ['en', 5, 'Resets in 5 days on DATE'],
    ['es', 1, 'Se restablece en 1 día, el DATE'],
    ['es', 2, 'Se restablece en 2 días, el DATE'],
    ['es', 5, 'Se restablece en 5 días, el DATE'],
    ['de', 1, 'Zurücksetzung in 1 Tag am DATE'],
    ['de', 2, 'Zurücksetzung in 2 Tagen am DATE'],
    ['de', 5, 'Zurücksetzung in 5 Tagen am DATE'],
    ['uk', 1, 'Скидання через 1 день, DATE'],
    ['uk', 2, 'Скидання через 2 дні, DATE'],
    ['uk', 5, 'Скидання через 5 днів, DATE'],
    ['uk', 21, 'Скидання через 21 день, DATE'],
    ['ru', 1, 'Сброс через 1 день, DATE'],
    ['ru', 2, 'Сброс через 2 дня, DATE'],
    ['ru', 5, 'Сброс через 5 дней, DATE'],
    ['ru', 21, 'Сброс через 21 день, DATE'],
  ] as const)('pluralizes %s reset day count %d', (locale, count, expected) => {
    expect(billingMessages[locale].limitReached.resetIn(count, 'DATE')).toBe(
      expected,
    );
  });
});
