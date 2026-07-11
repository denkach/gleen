'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToastProvider, useToast } from '@/components/ui/toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const tokenGroups = [
  {
    label: 'Surfaces',
    tokens: [
      ['Deep', 'background-deep'],
      ['Elevated', 'background-elevated'],
      ['Panel', 'surface-panel'],
      ['Raised', 'surface-raised'],
      ['Hover', 'surface-hover'],
    ],
  },
  {
    label: 'Artifact accents',
    tokens: [
      ['Summary', 'artifact-summary'],
      ['Flashcards', 'artifact-flashcards'],
      ['Timestamps', 'artifact-timestamps'],
      ['Export', 'artifact-export'],
    ],
  },
] as const;

const tabAccents = [
  'neutral',
  'summary',
  'flashcards',
  'timestamps',
  'export',
] as const;

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const headingId = `ui-${title.toLowerCase().replaceAll(' ', '-')}`;

  return (
    <section className="ui-preview-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}

function MotionPreference() {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return (
    <p className="ui-preview-motion" data-testid="reduced-motion-indicator">
      Reduced motion:{' '}
      <strong>{reduced === null ? 'detecting' : reduced ? 'on' : 'off'}</strong>
    </p>
  );
}

function ToastExamples() {
  const { toast } = useToast();

  return (
    <div className="ui-preview-row">
      <Button
        variant="soft"
        onClick={() => toast({ title: 'Neutral notification' })}
      >
        Show neutral toast
      </Button>
      <Button
        variant="soft"
        onClick={() =>
          toast({
            title: 'Successful notification',
            description: 'The example action completed.',
            variant: 'success',
          })
        }
      >
        Show success toast
      </Button>
      <Button
        variant="soft"
        onClick={() =>
          toast({
            title: 'Error notification',
            description: 'The example action needs attention.',
            variant: 'error',
            actionLabel: 'Retry',
            onAction: () => undefined,
          })
        }
      >
        Show error toast
      </Button>
    </div>
  );
}

function PreviewGallery() {
  const [checked, setChecked] = useState(true);

  return (
    <main className="ui-preview">
      <header className="ui-preview-header">
        <p className="ui-preview-eyebrow">Environment-only reference</p>
        <h1>Gleen UI primitives</h1>
        <p>Interactive states and shared tokens for implementation review.</p>
        <MotionPreference />
      </header>

      <Section title="Tokens">
        <div className="ui-preview-token-groups">
          {tokenGroups.map((group) => (
            <div key={group.label}>
              <h3>{group.label}</h3>
              <div className="ui-preview-tokens">
                {group.tokens.map(([label, token]) => (
                  <div className="ui-preview-token" key={token}>
                    <span style={{ background: `var(--${token})` }} />
                    <div>
                      <strong>{label}</strong>
                      <code>--{token}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="ui-preview-row">
          <Button>Primary</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button size="sm">Small</Button>
          <Button size="icon" aria-label="Add example">
            +
          </Button>
          <Button disabled>Disabled</Button>
          <Button loading loadingLabel="Saving example">
            Save
          </Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="ui-preview-grid">
          <Input label="Default input" placeholder="Example value" />
          <Input label="Input with hint" hint="Supporting guidance." />
          <Input label="Input with icon" leadingIcon="⌕" />
          <Input
            label="Invalid input"
            defaultValue="Invalid"
            error="Review this value."
          />
          <Input label="Disabled input" disabled defaultValue="Unavailable" />
        </div>
      </Section>

      <Section title="Panels">
        <div className="ui-preview-grid">
          <Panel padding="sm">Panel surface · small padding</Panel>
          <Panel padding="md" surface="raised">
            Raised surface · medium padding
          </Panel>
          <Panel padding="lg">Panel surface · large padding</Panel>
        </div>
      </Section>

      <Section title="Overlays">
        <div className="ui-preview-row">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="soft">Open example dialog</Button>
            </DialogTrigger>
            <DialogContent
              title="Example dialog"
              description="A neutral interaction for primitive review."
            >
              <DialogClose asChild>
                <Button>Confirm example</Button>
              </DialogClose>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="soft">Open example menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Example options</DropdownMenuLabel>
              <DropdownMenuItem>Available item</DropdownMenuItem>
              <DropdownMenuItem disabled>Disabled item</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={checked}
                onCheckedChange={(value) => setChecked(value === true)}
              >
                Checked option
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Focus for tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Keyboard and pointer guidance</TooltipContent>
          </Tooltip>
        </div>
      </Section>

      <Section title="Tab accents">
        <div className="ui-preview-tabs">
          {tabAccents.map((accent) => (
            <Tabs defaultValue="one" key={accent}>
              <h3>{accent}</h3>
              <TabsList accent={accent} aria-label={`${accent} example tabs`}>
                <TabsTrigger value="one">First</TabsTrigger>
                <TabsTrigger value="two">Second</TabsTrigger>
                <TabsTrigger value="three" disabled>
                  Disabled
                </TabsTrigger>
              </TabsList>
              <TabsContent value="one">First tab content</TabsContent>
              <TabsContent value="two">Second tab content</TabsContent>
            </Tabs>
          ))}
        </div>
      </Section>

      <Section title="Toasts">
        <ToastExamples />
      </Section>

      <Section title="Skeletons">
        <div className="ui-preview-grid">
          <div>
            <h3>Rectangle</h3>
            <Skeleton className="ui-preview-skeleton-rect" />
          </div>
          <div>
            <h3>Text lines</h3>
            <Skeleton shape="text" lines={4} />
          </div>
        </div>
      </Section>
    </main>
  );
}

export function UiPreview() {
  return (
    <TooltipProvider>
      <ToastProvider>
        <PreviewGallery />
      </ToastProvider>
    </TooltipProvider>
  );
}
