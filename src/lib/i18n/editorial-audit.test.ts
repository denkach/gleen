import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { supportedLocales } from './locales';
import { appMessages } from './messages/app';
import { authMessages } from './messages/auth';
import { billingMessages } from './messages/billing';
import { emailMessages } from './messages/email';
import { historyMessages } from './messages/history';
import { marketingMessages } from './messages/marketing';
import { onboardingMessages } from './messages/onboarding';
import { resultMessages } from './messages/results';
import { settingsMessages } from './messages/settings';
import { sharedMessages } from './messages/shared';

const catalogNames = [
  'shared',
  'marketing',
  'auth',
  'onboarding',
  'app',
  'history',
  'results',
  'billing',
  'settings',
  'email',
] as const;

const catalogs = {
  shared: sharedMessages,
  marketing: marketingMessages,
  auth: authMessages,
  onboarding: onboardingMessages,
  app: appMessages,
  history: historyMessages,
  results: resultMessages,
  billing: billingMessages,
  settings: settingsMessages,
  email: emailMessages,
} as const;

const auditPath = resolve(
  process.cwd(),
  'docs/localization/den-22-editorial-audit.md',
);

function messageLeaves(
  value: unknown,
  path = '',
): readonly { path: string; value: string }[] {
  if (typeof value === 'string') return [{ path, value }];
  if (typeof value === 'function') return [{ path, value: value.toString() }];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    messageLeaves(child, path ? `${path}.${key}` : key),
  );
}

describe('DEN-22 editorial audit inventory', () => {
  it('records an approved or revised ledger row for all 50 locale/catalog pairs', () => {
    const audit = readFileSync(auditPath, 'utf8');
    const rows = [
      ...audit.matchAll(
        /^\|\s*(uk|ru|en|es|de)\s*\|\s*(shared|marketing|auth|onboarding|app|history|results|billing|settings|email)\s*\|\s*(approved|revised)\s*\|\s*([^|]*)\|\s*([^|]*)\|$/gm,
      ),
    ];
    const actual = rows.map(([, locale, catalog]) => `${locale}/${catalog}`);
    const expected = supportedLocales.flatMap((locale) =>
      catalogNames.map((catalog) => `${locale}/${catalog}`),
    );

    expect(rows).toHaveLength(50);
    expect(new Set(actual).size).toBe(50);
    expect(actual.sort()).toEqual(expected.sort());
  });

  it('allows translated plan words only at explicitly audited non-plan paths', () => {
    const audit = readFileSync(auditPath, 'utf8');
    const allowed = [
      ...audit.matchAll(
        /^\|\s*(uk|ru|en|es|de)\s*\|\s*(shared|marketing|auth|onboarding|app|history|results|billing|settings|email)\s*\|\s*([a-zA-Z0-9.-]+)\s*\|\s*[^|]+\|$/gm,
      ),
    ].map(([, locale, catalog, path]) => `${locale}/${catalog}/${path}`);
    const translatedPlanName =
      /(?:^|[^\p{L}])(безкоштовн\p{L}*|бесплатн\p{L}*|gratis|gratuit\p{L}*|kostenlos\p{L}*|kostenfrei\p{L}*|призма|призму|призмы|призми|спектр|спектром|спектру|prisma|espectro|spektrum)(?:$|[^\p{L}])/iu;
    const found = supportedLocales.flatMap((locale) =>
      catalogNames.flatMap((catalog) =>
        messageLeaves(catalogs[catalog][locale])
          .filter(({ value }) => translatedPlanName.test(value))
          .map(({ path }) => `${locale}/${catalog}/${path}`),
      ),
    );

    expect(found.sort()).toEqual(allowed.sort());
  });
});
