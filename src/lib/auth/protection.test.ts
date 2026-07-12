import { describe, expect, it } from 'vitest';

import { protectedRouteRedirect } from './protection';

describe('protected route decisions', () => {
  it('sends anonymous users to sign in with a safe return path', () => {
    expect(protectedRouteRedirect('/protected', null)).toBe(
      '/sign-in?next=%2Fprotected',
    );
    expect(protectedRouteRedirect('/onboarding?step=2', null)).toBe(
      '/sign-in?next=%2Fonboarding%3Fstep%3D2',
    );
    expect(protectedRouteRedirect('/app/history', null)).toBe(
      '/sign-in?next=%2Fapp%2Fhistory',
    );
  });

  it('allows authenticated users through', () => {
    expect(protectedRouteRedirect('/protected', 'user-1')).toBeNull();
  });
});
