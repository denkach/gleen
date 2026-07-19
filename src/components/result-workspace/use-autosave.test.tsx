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
      <output aria-label="Saved revision">{autosave.revision}</output>
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

  it('advances the CAS revision before saving an edit made during an in-flight save', async () => {
    let resolveFirst!: (value: SaveResult) => void;
    const first = new Promise<SaveResult>((resolve) => {
      resolveFirst = resolve;
    });
    const save = vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce({
      status: 'saved',
      updatedAt: '2026-07-18T00:02:00.000Z',
    });
    render(<Harness save={save} />);
    const input = screen.getByRole('textbox', { name: 'Title' });

    fireEvent.change(input, { target: { value: 'First' } });
    await act(() => vi.advanceTimersByTimeAsync(700));
    fireEvent.change(input, { target: { value: 'Latest' } });
    await act(() => vi.advanceTimersByTimeAsync(700));
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst({
        status: 'saved',
        updatedAt: '2026-07-18T00:01:00.000Z',
      });
      await Promise.resolve();
    });
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(save).toHaveBeenNthCalledWith(
      2,
      'Latest',
      '2026-07-18T00:01:00.000Z',
    );
    expect(input).toHaveValue('Latest');
  });

  it('exposes the last successfully saved revision to dependent mutations', async () => {
    const save = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt: '2026-07-18T00:03:00.000Z',
    });
    render(<Harness save={save} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Edited' },
    });
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(screen.getByLabelText('Saved revision')).toHaveTextContent(
      '2026-07-18T00:03:00.000Z',
    );
  });

  it('shows a conflict without offering a stale-revision retry', async () => {
    const save = vi.fn().mockResolvedValueOnce({ status: 'conflict' });
    render(<Harness save={save} />);
    const input = screen.getByRole('textbox', { name: 'Title' });

    fireEvent.change(input, { target: { value: 'Keep me' } });
    await act(() => vi.advanceTimersByTimeAsync(700));
    expect(screen.getByText('conflict')).toBeVisible();
    expect(input).toHaveValue('Keep me');
    expect(save).toHaveBeenCalledTimes(1);
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
