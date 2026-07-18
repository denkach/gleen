import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import { LandingAnalysisForm } from './landing-analysis-form';

describe('LandingAnalysisForm', () => {
  beforeEach(() => push.mockClear());

  it('navigates through sign in with one normalized continuation on submit', async () => {
    const user = userEvent.setup();
    render(<LandingAnalysisForm />);

    await user.clear(screen.getByLabelText('YouTube URL'));
    await user.type(
      screen.getByLabelText('YouTube URL'),
      'https://youtu.be/dQw4w9WgXcQ',
    );
    await user.click(screen.getByRole('button', { name: 'Transform video' }));

    const continuation =
      '/app?continuation=' +
      encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(push).toHaveBeenCalledWith(
      `/sign-in?next=${encodeURIComponent(continuation)}`,
    );
  });

  it('supports keyboard submission and reports an invalid YouTube URL', async () => {
    const user = userEvent.setup();
    render(<LandingAnalysisForm />);

    const input = screen.getByLabelText('YouTube URL');
    await user.clear(input);
    await user.type(input, 'https://example.com/video');
    fireEvent.submit(input.closest('form')!);

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a supported YouTube URL.',
    );
  });
});
