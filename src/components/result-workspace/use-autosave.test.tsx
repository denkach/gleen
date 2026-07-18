import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutosave } from './use-autosave';

type SaveResult =
  | Readonly<{ status: 'saved'; updatedAt: string }>
  | Readonly<{ status: 'conflict' | 'error' }>;

function Harness({
  save,
}: Readonly<{
  save: (value: string, revision: string) => Promise<SaveResult>;
}>) {
  const [value, setValue] = useState('Original');
  const autosave = useAutosave({
    value,
    revision: '2026-07-18T00:00:00.000Z',
    save,
    delayMs: 700,
  });
  return (
    <>
      <label>
        Title
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <output>{autosave.status}</output>
      <button type="button" onClick={autosave.retry}>
        Retry
      </button>
    </>
  );
}

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('saves once after 700ms and does not save unchanged content again', async () => {
    const save = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt: '2026-07-18T00:01:00.000Z',
    });
    render(<Harness save={save} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Edited' },
    });
    expect(save).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('Edited', '2026-07-18T00:00:00.000Z');
    expect(screen.getByText('saved')).toBeVisible();
    await act(() => vi.advanceTimersByTimeAsync(1_400));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('only saves the latest edit in the debounce window', async () => {
    const save = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt: '2026-07-18T00:01:00.000Z',
    });
    render(<Harness save={save} />);

    const input = screen.getByRole('textbox', { name: 'Title' });
    fireEvent.change(input, { target: { value: 'First' } });
    await act(() => vi.advanceTimersByTimeAsync(699));
    fireEvent.change(input, { target: { value: 'Latest' } });
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('Latest', '2026-07-18T00:00:00.000Z');
  });

  it('shows a conflict and retry keeps the current input', async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce({ status: 'conflict' })
      .mockResolvedValueOnce({
        status: 'saved',
        updatedAt: '2026-07-18T00:01:00.000Z',
      });
    render(<Harness save={save} />);
    const input = screen.getByRole('textbox', { name: 'Title' });

    fireEvent.change(input, { target: { value: 'Keep me' } });
    await act(() => vi.advanceTimersByTimeAsync(700));
    expect(screen.getByText('conflict')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(input).toHaveValue('Keep me');
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('never claims an offline edit was saved', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    const save = vi.fn();
    render(<Harness save={save} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Offline' },
    });
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText('offline')).toBeVisible();
    expect(screen.queryByText('saved')).toBeNull();
  });
});
