import { describe, expect, it } from 'vitest';

import { getBrowserMotionPolicy, getMotionPolicy } from './motion-policy';

describe('getMotionPolicy', () => {
  it('disables GSAP and the cursor for reduced motion', () => {
    expect(getMotionPolicy({ reducedMotion: true, finePointer: true })).toEqual(
      {
        enableGsap: false,
        enableCursor: false,
      },
    );
  });

  it('keeps scroll motion without a cursor for coarse pointers', () => {
    expect(
      getMotionPolicy({ reducedMotion: false, finePointer: false }),
    ).toEqual({
      enableGsap: true,
      enableCursor: false,
    });
  });

  it('enables both layers for a fine pointer', () => {
    expect(
      getMotionPolicy({ reducedMotion: false, finePointer: true }),
    ).toEqual({
      enableGsap: true,
      enableCursor: true,
    });
  });

  it('fails closed when matchMedia is unavailable', () => {
    expect(getBrowserMotionPolicy(undefined)).toEqual({
      enableGsap: false,
      enableCursor: false,
    });
  });
});
