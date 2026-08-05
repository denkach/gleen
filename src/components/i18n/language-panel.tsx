'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactElement,
} from 'react';

import {
  Dialog,
  DialogClose,
  DialogContentPrimitive,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  localeMetadata,
  supportedLocales,
  type Locale,
} from '@/lib/i18n/locales';
import type { LocaleSwitcherCopy } from '@/lib/i18n/messages/shared';

type LanguagePanelProps = Readonly<{
  copy: LocaleSwitcherCopy;
  locale: Locale;
  onSelect: (locale: Locale) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform?: string;
  trigger: ReactElement;
  variant: 'landing' | 'auth' | 'app';
}>;

const selectionCloseDelay = 60;
const subscribeToPlatform = () => () => {};
const getBrowserPlatform = () => window.navigator.platform;
const getServerPlatform = () => '';

export function LanguagePanel({
  copy,
  locale,
  onSelect,
  open,
  onOpenChange,
  platform,
  trigger,
  variant,
}: LanguagePanelProps) {
  const titleId = useId();
  const descriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardModalityRef = useRef(false);
  const browserPlatform = useSyncExternalStore(
    subscribeToPlatform,
    getBrowserPlatform,
    getServerPlatform,
  );

  const positionPanelFromTrigger = useCallback((panel = panelRef.current) => {
    const activeTrigger = triggerRef.current;
    if (!activeTrigger || !panel) return;

    const triggerRect = activeTrigger.getBoundingClientRect();
    panel.style.setProperty(
      '--locale-language-panel-top',
      `${Math.round(triggerRect.bottom + 32)}px`,
    );
    panel.style.setProperty(
      '--locale-language-panel-right',
      `${Math.max(0, Math.round(window.innerWidth - triggerRect.right))}px`,
    );
  }, []);

  const setPanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      if (node) {
        node.dataset.focusModality = keyboardModalityRef.current
          ? 'keyboard'
          : 'pointer';
        positionPanelFromTrigger(node);
      }
    },
    [positionPanelFromTrigger],
  );

  const setFocusModality = useCallback((modality: 'keyboard' | 'pointer') => {
    keyboardModalityRef.current = modality === 'keyboard';
    if (panelRef.current) panelRef.current.dataset.focusModality = modality;
  }, []);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const handleKeyboard = () => setFocusModality('keyboard');
    const handlePointer = () => setFocusModality('pointer');
    document.addEventListener('keydown', handleKeyboard, true);
    document.addEventListener('pointerdown', handlePointer, true);
    return () => {
      document.removeEventListener('keydown', handleKeyboard, true);
      document.removeEventListener('pointerdown', handlePointer, true);
    };
  }, [setFocusModality]);

  useEffect(() => {
    if (!open) return;

    const handleResize = () => positionPanelFromTrigger();
    positionPanelFromTrigger();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, positionPanelFromTrigger]);

  function select(candidate: Locale) {
    onSelect(candidate);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onOpenChange(false);
    }, selectionCloseDelay);
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(supportedLocales[currentIndex]);
      return;
    }

    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }

    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? supportedLocales.length - 1
          : (currentIndex + delta + supportedLocales.length) %
            supportedLocales.length;
    optionRefs.current[nextIndex]?.focus();
  }

  const selectedIndex = supportedLocales.indexOf(locale);
  const shortcutLabel = /mac/i.test(platform ?? browserPlatform)
    ? '⌘ K'
    : 'Ctrl K';
  const selectedRef = {
    get current() {
      return optionRefs.current[selectedIndex] ?? null;
    },
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) positionPanelFromTrigger();
        onOpenChange(nextOpen);
      }}
    >
      <DialogTrigger asChild ref={triggerRef}>
        {trigger}
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay
          className="locale-language-panel__scrim"
          data-variant={variant}
        />
        <DialogContentPrimitive
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          className="locale-language-panel"
          data-variant={variant}
          ref={setPanelRef}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            setFocusModality(
              keyboardModalityRef.current ? 'keyboard' : 'pointer',
            );
            selectedRef.current?.focus();
          }}
        >
          <header className="locale-language-panel__header">
            <div>
              <DialogTitle
                id={titleId}
                className="locale-language-panel__title"
              >
                {copy.localeSwitcher.panelTitle}
              </DialogTitle>
              <DialogDescription
                id={descriptionId}
                className="locale-language-panel__description"
              >
                {copy.localeSwitcher.panelDescription}
              </DialogDescription>
            </div>
            <DialogClose
              aria-label={copy.localeSwitcher.close}
              className="locale-language-panel__close"
            >
              <span aria-hidden="true">×</span>
            </DialogClose>
          </header>

          <div
            aria-label={copy.localeSwitcher.panelDescription}
            className="locale-language-panel__options"
            role="radiogroup"
          >
            {supportedLocales.map((candidate, index) => {
              const metadata = localeMetadata[candidate];
              const selected = candidate === locale;

              return (
                <button
                  aria-checked={selected}
                  aria-label={`${metadata.nativeName} ${metadata.englishName}`}
                  className="locale-language-panel__option"
                  data-state={selected ? 'checked' : 'unchecked'}
                  key={candidate}
                  onClick={() => select(candidate)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  role="radio"
                  tabIndex={selected ? 0 : -1}
                  type="button"
                >
                  <span
                    className="locale-language-panel__radio"
                    aria-hidden="true"
                  />
                  <span className="locale-language-panel__names">
                    <span className="locale-language-panel__native-name">
                      {metadata.nativeName}
                    </span>
                    <span className="locale-language-panel__english-name">
                      {metadata.englishName}
                    </span>
                  </span>
                  {selected ? (
                    <span
                      aria-hidden="true"
                      className="locale-language-panel__selected"
                    >
                      {copy.localeSwitcher.selected}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <footer className="locale-language-panel__footer">
            <kbd>{shortcutLabel}</kbd>
            <span>{copy.localeSwitcher.quickSwitch}</span>
          </footer>
        </DialogContentPrimitive>
      </DialogPortal>
    </Dialog>
  );
}
