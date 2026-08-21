import { render, screen as testingScreen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getRequestLocale,
  isUiPreviewEnabled,
  notFound,
  renderFixture,
  renderShell,
  usePathname,
  refresh,
} = vi.hoisted(() => ({
  getRequestLocale: vi.fn(async () => 'en'),
  isUiPreviewEnabled: vi.fn(),
  notFound: vi.fn((): never => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  renderFixture: vi.fn(),
  renderShell: vi.fn(),
  usePathname: vi.fn(() => '/billing-fixture/checkout'),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound,
  usePathname,
  useRouter: () => ({ refresh }),
}));
vi.mock('@/lib/ui-preview', () => ({ isUiPreviewEnabled }));
vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));
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
  beforeEach(() => {
    vi.clearAllMocks();
    getRequestLocale.mockResolvedValue('en');
  });

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

  it('uses the normal request locale without an explicit fixture override', async () => {
    isUiPreviewEnabled.mockReturnValue(true);
    getRequestLocale.mockResolvedValue('de');

    render(
      await BillingFixturePage({
        params: Promise.resolve({ screen: 'subscription' }),
        searchParams: Promise.resolve({ state: 'active' }),
      }),
    );

    expect(renderShell).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'de' }),
    );
    expect(renderFixture).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'de' }),
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
      '/billing-fixture/subscription?locale=de',
    );
    expect(
      testingScreen.getByRole('link', { name: 'Nutzung' }),
    ).toHaveAttribute('href', '/billing-fixture/usage?locale=de');

    await user.click(
      testingScreen.getByRole('button', {
        name: 'Weitere Abrechnungsseiten',
      }),
    );
    expect(
      testingScreen.getByRole('link', { name: '04 · Abrechnungsportal' }),
    ).toHaveAttribute('href', '/billing-fixture/portal?locale=de');
  });

  it('renders a deterministic subscription recovery with working support and retry feedback', async () => {
    const user = userEvent.setup();
    const { BillingFixtureScreen } =
      await vi.importActual<typeof import('./fixture-screen')>(
        './fixture-screen',
      );

    render(
      <BillingFixtureScreen
        fixture={getBillingFixture('subscription', 'error', 'en')}
        locale="en"
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
      testingScreen.getByRole('link', { name: 'Contact support' }),
    ).toHaveAttribute('href', 'mailto:gleen_support@gmail.com');
    await user.click(
      testingScreen.getByRole('button', {
        name: 'Reload subscription details',
      }),
    );
    expect(await testingScreen.findByRole('alert')).toHaveTextContent(
      'We still could not load billing details. Try again.',
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
