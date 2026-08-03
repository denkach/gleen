import { render, screen as testingScreen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  isUiPreviewEnabled,
  notFound,
  renderFixture,
  renderShell,
  usePathname,
} = vi.hoisted(() => ({
  isUiPreviewEnabled: vi.fn(),
  notFound: vi.fn((): never => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  renderFixture: vi.fn(),
  renderShell: vi.fn(),
  usePathname: vi.fn(() => '/billing-fixture/checkout'),
}));

vi.mock('next/navigation', () => ({ notFound, usePathname }));
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
    locale: string;
  }) => {
    renderShell(props);
    return <div data-testid="fixture-shell">{props.children}</div>;
  },
}));

import BillingFixturePage from './page';
import { getBillingFixture } from '@/lib/billing/fixtures';

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

  it.each(['uk', 'ru', 'en', 'es', 'de'] as const)(
    'selects the exact %s fixture locale at the shell and billing boundaries',
    async (locale) => {
      isUiPreviewEnabled.mockReturnValue(true);

      render(
        await BillingFixturePage({
          params: Promise.resolve({ screen: 'subscription' }),
          searchParams: Promise.resolve({ state: 'active', locale }),
        }),
      );

      expect(renderShell).toHaveBeenCalledWith(
        expect.objectContaining({ locale }),
      );
      expect(renderFixture).toHaveBeenCalledWith(
        expect.objectContaining({ locale }),
      );
    },
  );

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

  it('keeps localized checkout fixture controls inside fixture routes', async () => {
    const user = userEvent.setup();
    const { BillingFixtureScreen } =
      await vi.importActual<typeof import('./fixture-screen')>(
        './fixture-screen',
      );

    render(
      <BillingFixtureScreen
        fixture={getBillingFixture('checkout', 'active', 'de')}
        locale="de"
        testBoundary={null}
        routeQuery={{
          search: '',
          eventType: null,
          range: 'current',
          status: null,
          year: null,
          cursor: null,
        }}
      />,
    );

    expect(
      testingScreen.getByRole('group', {
        name: 'Sichere Stripe-Zahlungsvorschau',
      }),
    ).toBeInTheDocument();
    expect(
      testingScreen.getByText('◇ Hast du einen Aktionscode?'),
    ).toBeInTheDocument();
    expect(testingScreen.getByRole('link', { name: 'Tarif' })).toHaveAttribute(
      'href',
      '/billing-fixture/subscription',
    );
    expect(
      testingScreen.getByRole('link', { name: 'Nutzung' }),
    ).toHaveAttribute('href', '/billing-fixture/usage');

    await user.click(
      testingScreen.getByRole('button', {
        name: 'Weitere Abrechnungsseiten',
      }),
    );
    expect(
      testingScreen.getByRole('link', { name: '04 · Abrechnungsportal' }),
    ).toHaveAttribute('href', '/billing-fixture/portal');
  });
});
