import { describe, expect, it } from 'vitest';

import { supportEmailAddress, supportEmailHref } from './support';

describe('support contact', () => {
  it('exposes the approved mailbox as a working email destination', () => {
    expect(supportEmailAddress).toBe('gleen_support@gmail.com');
    expect(supportEmailHref).toBe('mailto:gleen_support@gmail.com');
  });
});
