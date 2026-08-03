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
import type { UiPreviewCopy } from '@/lib/i18n/messages/shared';

function tokenGroups(copy: UiPreviewCopy) {
  return [
    {
      label: copy.surfaces,
      tokens: [
        [copy.deep, 'background-deep'],
        [copy.elevated, 'background-elevated'],
        [copy.panel, 'surface-panel'],
        [copy.raised, 'surface-raised'],
        [copy.hover, 'surface-hover'],
      ],
    },
    {
      label: copy.artifactAccents,
      tokens: [
        [copy.summary, 'artifact-summary'],
        [copy.flashcards, 'artifact-flashcards'],
        [copy.timestamps, 'artifact-timestamps'],
        [copy.export, 'artifact-export'],
      ],
    },
  ] as const;
}

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

function MotionPreference({ copy }: Readonly<{ copy: UiPreviewCopy }>) {
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
      {copy.motionLabel}{' '}
      <strong>
        {reduced === null
          ? copy.motionDetecting
          : reduced
            ? copy.motionOn
            : copy.motionOff}
      </strong>
    </p>
  );
}

function ToastExamples({ copy }: Readonly<{ copy: UiPreviewCopy }>) {
  const { toast } = useToast();
  const [actionResult, setActionResult] = useState(copy.noToastAction);

  return (
    <div>
      <div className="ui-preview-row">
        <Button
          variant="soft"
          onClick={() => toast({ title: copy.neutralNotification })}
        >
          {copy.showNeutralToast}
        </Button>
        <Button
          variant="soft"
          onClick={() =>
            toast({
              title: copy.successfulNotification,
              description: copy.successDescription,
              variant: 'success',
            })
          }
        >
          {copy.showSuccessToast}
        </Button>
        <Button
          variant="soft"
          onClick={() =>
            toast({
              title: copy.errorNotification,
              description: copy.errorDescription,
              variant: 'error',
              actionLabel: copy.retry,
              onAction: () => setActionResult(copy.retryAction),
            })
          }
        >
          {copy.showErrorToast}
        </Button>
        <Button
          variant="soft"
          onClick={() =>
            toast({
              title: copy.longToastTitle,
              description: copy.longToastDescription,
            })
          }
        >
          {copy.showLongToast}
        </Button>
      </div>
      <p
        className="ui-preview-motion"
        role="status"
        aria-label={copy.toastActionResult}
      >
        {actionResult}
      </p>
    </div>
  );
}

function PreviewGallery({ copy }: Readonly<{ copy: UiPreviewCopy }>) {
  const [checked, setChecked] = useState(true);

  return (
    <main className="ui-preview">
      <header className="ui-preview-header">
        <p className="ui-preview-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        <MotionPreference copy={copy} />
      </header>

      <Section title={copy.tokens}>
        <div className="ui-preview-token-groups">
          {tokenGroups(copy).map((group) => (
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

      <Section title={copy.buttons}>
        <div className="ui-preview-row">
          <Button>{copy.primary}</Button>
          <Button variant="soft">{copy.soft}</Button>
          <Button variant="ghost">{copy.ghost}</Button>
          <Button variant="danger">{copy.danger}</Button>
          <Button size="sm">{copy.small}</Button>
          <Button size="icon" aria-label={copy.addExample}>
            +
          </Button>
          <Button disabled>{copy.disabled}</Button>
          <Button loading loadingLabel={copy.savingExample}>
            {copy.save}
          </Button>
        </div>
      </Section>

      <Section title={copy.inputs}>
        <div className="ui-preview-grid">
          <Input label={copy.defaultInput} placeholder={copy.exampleValue} />
          <Input label={copy.inputWithHint} hint={copy.supportingGuidance} />
          <Input label={copy.inputWithIcon} leadingIcon="⌕" />
          <Input
            label={copy.invalidInput}
            defaultValue={copy.invalid}
            error={copy.reviewValue}
          />
          <Input
            label={copy.disabledInput}
            disabled
            defaultValue={copy.unavailable}
          />
          <Input
            label={copy.longInputLabel}
            hint={copy.longInputHint}
            error={copy.longInputError}
            defaultValue={copy.longInputValue}
          />
        </div>
      </Section>

      <Section title={copy.panels}>
        <div className="ui-preview-grid">
          <Panel padding="sm">{copy.panelSmall}</Panel>
          <Panel padding="md" surface="raised">
            {copy.panelMedium}
          </Panel>
          <Panel padding="lg">{copy.panelLarge}</Panel>
          <Panel
            className="ui-preview-long-panel"
            padding="lg"
            role="region"
            aria-label={copy.longPanelLabel}
          >
            <h3>{copy.constrainedParagraph}</h3>
            <p>{copy.constrainedParagraphBody}</p>
          </Panel>
        </div>
      </Section>

      <Section title={copy.overlays}>
        <div className="ui-preview-row">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="soft">{copy.openDialog}</Button>
            </DialogTrigger>
            <DialogContent
              title={copy.dialogTitle}
              description={copy.dialogDescription}
              closeLabel={copy.closeDialog}
            >
              <DialogClose asChild>
                <Button>{copy.confirmExample}</Button>
              </DialogClose>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="soft">{copy.openLongDialog}</Button>
            </DialogTrigger>
            <DialogContent
              title={copy.longDialogTitle}
              description={copy.longDialogDescription}
              closeLabel={copy.closeDialog}
            >
              <p>{copy.longDialogBody}</p>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="soft">{copy.openMenu}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>{copy.menuOptions}</DropdownMenuLabel>
              <DropdownMenuItem>{copy.availableItem}</DropdownMenuItem>
              <DropdownMenuItem disabled>{copy.disabledItem}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={checked}
                onCheckedChange={(value) => setChecked(value === true)}
              >
                {copy.checkedOption}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="soft">{copy.openLongMenu}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>
                {copy.constrainedLongContent}
              </DropdownMenuLabel>
              <DropdownMenuItem>{copy.longMenuItem}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">{copy.focusTooltip}</Button>
            </TooltipTrigger>
            <TooltipContent>{copy.tooltipGuidance}</TooltipContent>
          </Tooltip>
        </div>
      </Section>

      <Section title={copy.tabAccents}>
        <div className="ui-preview-tabs">
          {tabAccents.map((accent) => (
            <Tabs defaultValue="one" key={accent}>
              <h3>{accent}</h3>
              <TabsList accent={accent} aria-label={copy.exampleTabs(accent)}>
                <TabsTrigger value="one">{copy.first}</TabsTrigger>
                <TabsTrigger value="two">{copy.second}</TabsTrigger>
                <TabsTrigger value="three" disabled>
                  {copy.disabled}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="one">{copy.firstTabContent}</TabsContent>
              <TabsContent value="two">{copy.secondTabContent}</TabsContent>
            </Tabs>
          ))}
          <Tabs className="ui-preview-long-tabs" defaultValue="short">
            <h3>{copy.constrainedLongContent}</h3>
            <TabsList aria-label={copy.longTabsLabel}>
              <TabsTrigger value="short">{copy.shortLabel}</TabsTrigger>
              <TabsTrigger value="long">{copy.longTabLabel}</TabsTrigger>
            </TabsList>
            <TabsContent value="short">{copy.selectLongLabel}</TabsContent>
            <TabsContent value="long">{copy.longTabContent}</TabsContent>
          </Tabs>
        </div>
      </Section>

      <Section title={copy.toasts}>
        <ToastExamples copy={copy} />
      </Section>

      <Section title={copy.skeletons}>
        <div className="ui-preview-grid">
          <div>
            <h3>{copy.rectangle}</h3>
            <Skeleton className="ui-preview-skeleton-rect" />
          </div>
          <div>
            <h3>{copy.textLines}</h3>
            <Skeleton shape="text" lines={4} />
          </div>
        </div>
      </Section>
    </main>
  );
}

export function UiPreview({ copy }: Readonly<{ copy: UiPreviewCopy }>) {
  return (
    <TooltipProvider>
      <ToastProvider
        labels={{
          neutral: copy.toastNoticeLabel,
          success: copy.toastSuccessLabel,
          error: copy.toastErrorLabel,
          dismiss: copy.dismissNotification,
          viewport: copy.notifications,
        }}
      >
        <PreviewGallery copy={copy} />
      </ToastProvider>
    </TooltipProvider>
  );
}
