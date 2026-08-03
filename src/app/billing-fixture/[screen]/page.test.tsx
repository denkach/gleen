import { render, screen as testingScreen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isUiPreviewEnabled, notFound, renderFixture, renderShell } = vi.hoisted(
  () => ({
    isUiPreviewEnabled: vi.fn(),
    notFound: vi.fn((): never => {
      throw new Error('NEXT_NOT_FOUND');
    }),
    renderFixture: vi.fn(),
    renderShell: vi.fn(),
  }),
);

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/ui-preview', () => ({ isUiPreviewEnabled }));
vi.mock('./fixture-screen', () => ({
  BillingFixtureScreen: (props: unknown) => {
    renderFixture(props);
    return null;
  },
}));
vi.mock('@/components/app-shell/app-shell', () => ({
  AppShell: (props: {
    children: React.ReactNode;
    usage: unknown;
    identity: unknown;
  }) => {
    renderShell(props);
    return <div data-testid="fixture-shell">{props.children}</div>;
  },
}));

import BillingFixturePage from './page';

describe('BillingFixturePage guard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns not found in production before resolving fixture data', async () => {
    isUiPreviewEnabled.mockReturnValue(false);

    await expect(
      BillingFixturePage({
        params: Promise.resolve({ screen: 'subscription' }),
        searchParams: Promise.resolve({ state: 'active' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(renderFixture).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown', 'active'],
    ['checkout', 'failed-invoice'],
    ['subscription', 'unknown'],
  ])('returns not found for invalid %s/%s selection', async (screen, state) => {
    isUiPreviewEnabled.mockReturnValue(true);

    await expect(
      BillingFixturePage({
        params: Promise.resolve({ screen }),
        searchParams: Promise.resolve({ state }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('passes a validated deterministic fixture to the client renderer', async () => {
    isUiPreviewEnabled.mockReturnValue(true);

    render(
      await BillingFixturePage({
        params: Promise.resolve({ screen: 'limit-reached' }),
        searchParams: Promise.resolve({ state: 'limit-reached' }),
      }),
    );

    expect(renderFixture).toHaveBeenCalledWith(
      expect.objectContaining({
        fixture: expect.objectContaining({
          screen: 'limit-reached',
          state: 'limit-reached',
          now: '2025-07-29T00:00:00.000Z',
        }),
      }),
    );
  });

  it.each([
    'portal-upgrade',
    'portal-downgrade',
    'portal-cancel',
    'portal-error',
  ] as const)('accepts the deterministic %s boundary', async (testBoundary) => {
    isUiPreviewEnabled.mockReturnValue(true);

    render(
      await BillingFixturePage({
        params: Promise.resolve({ screen: 'portal' }),
        searchParams: Promise.resolve({ state: 'active', testBoundary }),
      }),
    );

    expect(renderFixture).toHaveBeenCalledWith(
      expect.objectContaining({ testBoundary }),
    );
  });

  it.each([
    ['subscription', 'free', 'Free', 1, 3, 2],
    ['subscription', 'active', 'Starter', 3, 10, 7],
    ['limit-reached', 'limit-reached', 'Starter', 10, 10, 0],
  ])(
    'composes a state-aware shell for %s/%s',
    async (fixtureScreen, state, planName, used, limit, remaining) => {
      isUiPreviewEnabled.mockReturnValue(true);

      render(
        await BillingFixturePage({
          params: Promise.resolve({ screen: fixtureScreen }),
          searchParams: Promise.resolve({ state }),
        }),
      );

      expect(testingScreen.getByTestId('fixture-shell')).toBeInTheDocument();
      expect(renderShell).toHaveBeenCalledWith(
        expect.objectContaining({
          usage: {
            status: 'available',
            planName,
            used,
            remaining,
            limit,
            resetAt: '2025-08-01T00:00:00.000Z',
          },
        }),
      );
    },
  );
});
