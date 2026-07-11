import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MotionController, type MotionRuntime } from './motion-controller';

describe('MotionController', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sets up and cleans up an injected motion runtime', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const cleanup = vi.fn();
    const runtime: MotionRuntime = { setup: vi.fn(() => cleanup) };
    const loadMotion = vi.fn(async () => runtime);
    const { unmount } = render(
      <div data-marketing-root>
        <MotionController loadMotion={loadMotion} />
      </div>,
    );

    await waitFor(() => expect(runtime.setup).toHaveBeenCalledOnce());
    unmount();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('does not load motion when reduced motion is requested', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const loadMotion = vi.fn();
    render(
      <div data-marketing-root>
        <MotionController loadMotion={loadMotion} />
      </div>,
    );
    await Promise.resolve();
    expect(loadMotion).not.toHaveBeenCalled();
  });
});
