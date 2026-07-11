import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BeamInput, isYouTubeUrl } from './beam-input';

describe('isYouTubeUrl', () => {
  it.each([
    'https://youtube.com/watch?v=abc',
    'https://www.youtube.com/watch?v=abc',
    'http://m.youtube.com/watch?v=abc',
    'https://youtu.be/abc',
  ])('accepts %s', (value) => expect(isYouTubeUrl(value)).toBe(true));

  it.each([
    '',
    'youtube.com/watch?v=abc',
    'https://notyoutube.com/watch?v=abc',
    'javascript:alert(1)',
  ])('rejects %s', (value) => expect(isYouTubeUrl(value)).toBe(false));
});

describe('BeamInput', () => {
  afterEach(() => vi.useRealTimers());

  it('reports an invalid non-YouTube URL without starting the demo', () => {
    render(<BeamInput />);
    const input = screen.getByRole('textbox', { name: 'YouTube URL' });

    fireEvent.change(input, { target: { value: 'https://example.com/video' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Analyze a YouTube video' }));

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Use a YouTube or youtu.be URL.');
    expect(screen.getByRole('button', { name: 'Transform video' })).toBeEnabled();
  });

  it('runs a local non-networked demo and returns to idle', () => {
    vi.useFakeTimers();
    const onDemoStateChange = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<BeamInput onDemoStateChange={onDemoStateChange} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'YouTube URL' }), {
      target: { value: 'https://youtu.be/demo' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Analyze a YouTube video' }));

    expect(screen.getByRole('button', { name: 'Refracting…' })).toBeDisabled();
    expect(onDemoStateChange).toHaveBeenLastCalledWith('refracting');
    expect(fetchSpy).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1600));
    expect(screen.getByRole('status')).toHaveTextContent('Demo artifacts are ready.');
    expect(onDemoStateChange).toHaveBeenLastCalledWith('complete');

    act(() => vi.advanceTimersByTime(900));
    expect(screen.getByRole('button', { name: 'Transform video' })).toBeEnabled();
    expect(onDemoStateChange).toHaveBeenLastCalledWith('idle');
    fetchSpy.mockRestore();
  });
});
