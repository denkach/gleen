import { describe, expect, it } from 'vitest';
import {
  buildDataCapabilities,
  buildIntegrationCapabilities,
  buildSecurityCapabilities,
} from './capabilities';

describe('settings capabilities', () => {
  it('does not claim unsupported integrations are connected', () => {
    expect(
      buildIntegrationCapabilities().every(
        (item) => item.action.kind === 'unavailable',
      ),
    ).toBe(true);
  });

  it('derives the sign-in method without fabricating session counts', () => {
    expect(buildSecurityCapabilities('google')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'method', detail: 'Google' }),
      ]),
    );
    expect(JSON.stringify(buildSecurityCapabilities('google'))).not.toMatch(
      /sessionCount/i,
    );
  });

  it('links only to existing history and result-owned export surfaces', () => {
    const actions = buildDataCapabilities().map((item) => item.action);
    expect(actions).toContainEqual({ kind: 'link', href: '/app/history' });
    expect(actions).toContainEqual({ kind: 'unavailable' });
  });
});
