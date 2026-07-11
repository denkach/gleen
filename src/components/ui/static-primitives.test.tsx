import { createRef } from 'react';

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';
import { Input } from './input';
import { Panel } from './panel';
import { Skeleton } from './skeleton';

describe('Button', () => {
  it('defaults to a native button with deterministic variant and size attributes', () => {
    render(<Button>Continue</Button>);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('data-variant', 'primary');
    expect(button).toHaveAttribute('data-size', 'default');
  });

  it('exposes constrained variant and size attributes', () => {
    render(
      <Button variant="ghost" size="icon" aria-label="Open menu">
        +
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Open menu' });
    expect(button).toHaveAttribute('data-variant', 'ghost');
    expect(button).toHaveAttribute('data-size', 'icon');
  });

  it('disables loading buttons and uses the loading label as its accessible name', () => {
    render(
      <Button loading loadingLabel="Saving changes">
        Save
      </Button>,
    );

    expect(
      screen.getByRole('button', { name: 'Saving changes' }),
    ).toBeDisabled();
  });

  it('uses the loading label instead of a caller aria-labelledby while loading', () => {
    render(
      <>
        <span id="save-label">Save changes</span>
        <Button
          loading
          loadingLabel="Saving changes"
          aria-labelledby="save-label"
        >
          Save
        </Button>
      </>,
    );

    const button = screen.getByRole('button', { name: 'Saving changes' });
    expect(button).not.toHaveAttribute('aria-labelledby');
  });

  it('preserves caller aria-labelledby and forwards native props and its ref', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <>
        <span id="continue-label">Continue with video</span>
        <Button
          ref={ref}
          aria-labelledby="continue-label"
          form="video-form"
          name="intent"
          value="continue"
        >
          Continue
        </Button>
      </>,
    );

    const button = screen.getByRole('button', {
      name: 'Continue with video',
    });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute('aria-labelledby', 'continue-label');
    expect(button).toHaveAttribute('form', 'video-form');
    expect(button).toHaveAttribute('name', 'intent');
    expect(button).toHaveValue('continue');
  });

  it('preserves a native disabled state', () => {
    render(<Button disabled>Unavailable</Button>);

    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
  });
});

describe('Input', () => {
  it('associates its visible label and hint with the field', () => {
    render(<Input label="Video URL" hint="Paste a YouTube link" />);

    const input = screen.getByLabelText('Video URL');
    const hint = screen.getByText('Paste a YouTube link');
    expect(input).toHaveAttribute('aria-describedby', hint.id);
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('associates hint, error, and caller descriptions without overwriting any', () => {
    render(
      <>
        <span id="external-description">Public videos only</span>
        <Input
          label="Video URL"
          hint="Paste a YouTube link"
          error="Enter a valid URL"
          aria-describedby="external-description"
        />
      </>,
    );

    const input = screen.getByLabelText('Video URL');
    const describedBy =
      input.getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(describedBy).toContain('external-description');
    expect(describedBy).toContain(screen.getByText('Paste a YouTube link').id);
    expect(describedBy).toContain(screen.getByText('Enter a valid URL').id);
  });

  it('forwards its ref and native input props', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Input
        ref={ref}
        label="Video URL"
        name="videoUrl"
        required
        autoComplete="url"
      />,
    );

    const input = screen.getByLabelText('Video URL');
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('name', 'videoUrl');
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('autocomplete', 'url');
  });
});

describe('Panel', () => {
  it('exposes deterministic surface and padding attributes', () => {
    render(
      <Panel surface="raised" padding="lg">
        Content
      </Panel>,
    );

    const panel = screen.getByText('Content');
    expect(panel).toHaveAttribute('data-surface', 'raised');
    expect(panel).toHaveAttribute('data-padding', 'lg');
  });

  it('forwards its ref and native div props', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Panel ref={ref} title="Supporting context" />);

    expect(ref.current).toHaveAttribute('title', 'Supporting context');
  });
});

describe('Skeleton', () => {
  it('renders an aria-hidden rectangular placeholder by default', () => {
    const { container } = render(<Skeleton />);

    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstChild).toHaveAttribute('data-shape', 'rect');
  });

  it('renders the requested number of aria-hidden text lines', () => {
    const { container } = render(<Skeleton shape="text" lines={3} />);
    const skeleton = container.firstElementChild as HTMLElement;

    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(within(skeleton).getAllByTestId('skeleton-line')).toHaveLength(3);
  });

  it('clamps invalid text line counts to one', () => {
    const { container } = render(<Skeleton shape="text" lines={0} />);
    const skeleton = container.firstElementChild as HTMLElement;

    expect(within(skeleton).getAllByTestId('skeleton-line')).toHaveLength(1);
  });

  it('clamps huge finite text line counts to twenty', () => {
    const { container } = render(<Skeleton shape="text" lines={10_000} />);
    const skeleton = container.firstElementChild as HTMLElement;

    expect(within(skeleton).getAllByTestId('skeleton-line')).toHaveLength(20);
  });

  it('forwards its ref and native div props', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Skeleton ref={ref} title="Loading transcript" />);

    expect(ref.current).toHaveAttribute('title', 'Loading transcript');
  });
});
