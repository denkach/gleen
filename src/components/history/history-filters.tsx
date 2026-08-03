'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { HistoryQuery, HistoryStatusFilter } from '@/lib/history/query';
import type { HistoryFacets } from '@/lib/history/repository';
import type { HistoryMessages } from '@/lib/i18n/messages/history';

import { HistoryFilterIcon } from './history-toolbar-icons';
import type { HistoryFilterDraft } from './history-workspace';

const mobileHistoryQuery = '(max-width: 720px)';

const statusOptions = [
  'ready',
  'processing',
  'failed',
] as const satisfies readonly HistoryStatusFilter[];

const dateOptions = [
  'all',
  'today',
  '7d',
  '30d',
  'year',
] as const satisfies readonly HistoryQuery['date'][];

export type HistoryFiltersProps = Readonly<{
  draft: HistoryFilterDraft;
  copy: HistoryMessages;
  appliedCount: number;
  presentationCountOverride?: number;
  facets: HistoryFacets;
  open: boolean;
  onOpenChange(open: boolean): void;
  onChange(draft: HistoryFilterDraft): void;
  onApply(): void;
  onReset(): void;
  onClearAll(): void;
}>;

function filterCount(draft: HistoryFilterDraft): number {
  return (
    draft.status.length +
    Number(draft.language !== null) +
    Number(draft.source !== null) +
    Number(draft.date !== 'all') +
    Number(draft.favorite)
  );
}

function useMobileHistoryLayout(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(mobileHistoryQuery);
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return mobile;
}

export function HistoryFilters(props: HistoryFiltersProps) {
  const mobile = useMobileHistoryLayout();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(props.open);

  useEffect(() => {
    if (wasOpenRef.current && !props.open) {
      const timeout = window.setTimeout(() => triggerRef.current?.focus(), 0);
      wasOpenRef.current = props.open;
      return () => window.clearTimeout(timeout);
    }
    wasOpenRef.current = props.open;
  }, [props.open]);

  return mobile ? (
    <MobileHistoryFilters {...props} triggerRef={triggerRef} />
  ) : (
    <DesktopHistoryFilters {...props} triggerRef={triggerRef} />
  );
}

type HistoryFiltersPresentationProps = HistoryFiltersProps &
  Readonly<{ triggerRef: RefObject<HTMLButtonElement | null> }>;

function DesktopHistoryFilters({
  draft,
  copy,
  facets,
  open,
  onOpenChange,
  onChange,
  onApply,
  onReset,
  onClearAll,
  appliedCount,
  presentationCountOverride,
  triggerRef,
}: HistoryFiltersPresentationProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const count = presentationCountOverride ?? filterCount(draft);
  const presentedAppliedCount = presentationCountOverride ?? appliedCount;

  useEffect(() => {
    if (!open) return;

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onOpenChange(false);
    }

    function dismissOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        onOpenChange(false);
      }
    }

    document.addEventListener('keydown', dismissOnEscape);
    document.addEventListener('pointerdown', dismissOutside);
    return () => {
      document.removeEventListener('keydown', dismissOnEscape);
      document.removeEventListener('pointerdown', dismissOutside);
    };
  }, [onOpenChange, open]);

  return (
    <div
      ref={rootRef}
      className="history-filters history-filters--desktop"
      data-history-filter-presentation="desktop"
    >
      <FilterTrigger
        ref={triggerRef}
        count={presentedAppliedCount}
        copy={copy}
        mobile={false}
        open={open}
        controls={panelId}
        onClick={() => onOpenChange(!open)}
      />
      {open ? (
        <section
          id={panelId}
          className="history-filters__desktop-panel history-filter-panel"
          role="region"
          aria-labelledby={titleId}
        >
          <header className="history-filters__header">
            <h2 id={titleId} className="history-filters__title">
              {copy.filters.panelTitle}
            </h2>
            <button
              type="button"
              className="history-filters__reset"
              onClick={onReset}
            >
              {copy.filters.reset}
            </button>
          </header>
          <FilterFields
            idPrefix={`${panelId}-desktop`}
            draft={draft}
            copy={copy}
            facets={facets}
            onChange={onChange}
          />
          <footer className="history-filters__footer">
            <button
              type="button"
              className="history-filters__clear"
              onClick={onClearAll}
            >
              {copy.filters.clearAll}
            </button>
            <ApplyButton copy={copy} count={count} onApply={onApply} />
          </footer>
        </section>
      ) : null}
    </div>
  );
}

function MobileHistoryFilters({
  draft,
  copy,
  facets,
  open,
  onOpenChange,
  onChange,
  onApply,
  onReset,
  appliedCount,
  presentationCountOverride,
  triggerRef,
}: HistoryFiltersPresentationProps) {
  const count = presentationCountOverride ?? filterCount(draft);
  const presentedAppliedCount = presentationCountOverride ?? appliedCount;
  const fieldId = useId();

  return (
    <div
      className="history-filters history-filters--mobile"
      data-history-filter-presentation="mobile"
    >
      <FilterTrigger
        ref={triggerRef}
        count={presentedAppliedCount}
        copy={copy}
        mobile
        open={open}
        onClick={() => onOpenChange(!open)}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          title={copy.filters.dialogTitle}
          description={copy.filters.dialogDescription}
          closeLabel={copy.filters.close}
          className="history-filters__mobile-sheet history-filter-sheet"
        >
          <span
            className="history-filters__drag-affordance"
            data-testid="history-filters-drag-affordance"
            aria-hidden="true"
          />
          <button
            type="button"
            className="history-filters__reset"
            onClick={onReset}
          >
            {copy.filters.reset}
          </button>
          <FilterFields
            idPrefix={`${fieldId}-mobile`}
            draft={draft}
            copy={copy}
            facets={facets}
            onChange={onChange}
          />
          <div className="history-filters__mobile-actions">
            <ApplyButton copy={copy} count={count} onApply={onApply} />
            <p className="history-filters__applied-note">
              {copy.filters.appliedNote(presentedAppliedCount)}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const FilterTrigger = ({
  ref,
  count,
  copy,
  mobile,
  open,
  controls,
  onClick,
}: Readonly<{
  ref: RefObject<HTMLButtonElement | null>;
  count: number;
  copy: HistoryMessages;
  mobile: boolean;
  open: boolean;
  controls?: string;
  onClick(): void;
}>) => (
  <button
    ref={ref}
    type="button"
    className="history-filters__trigger"
    aria-label={copy.filters.triggerLabel(mobile, count)}
    aria-expanded={open}
    aria-controls={controls}
    aria-haspopup={mobile ? 'dialog' : undefined}
    onClick={onClick}
  >
    <HistoryFilterIcon />
    {mobile ? copy.filters.mobileTrigger : copy.filters.desktopTrigger}
    {count > 0 ? (
      <span className="history-filters__count" aria-hidden="true">
        {count}
      </span>
    ) : null}
  </button>
);

function ApplyButton({
  copy,
  count,
  onApply,
}: Readonly<{ copy: HistoryMessages; count: number; onApply(): void }>) {
  return (
    <button type="button" className="history-filters__apply" onClick={onApply}>
      {copy.filters.apply(count)}
    </button>
  );
}

function FilterFields({
  idPrefix,
  draft,
  copy,
  facets,
  onChange,
}: Readonly<{
  idPrefix: string;
  draft: HistoryFilterDraft;
  copy: HistoryMessages;
  facets: HistoryFacets;
  onChange(draft: HistoryFilterDraft): void;
}>) {
  function toggleStatus(status: HistoryStatusFilter) {
    onChange({
      ...draft,
      status: draft.status.includes(status)
        ? draft.status.filter((value) => value !== status)
        : [...draft.status, status],
    });
  }

  function changeScalar(
    key: 'language' | 'source',
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    onChange({ ...draft, [key]: event.currentTarget.value || null });
  }

  return (
    <div className="history-filters__fields">
      <fieldset className="history-filters__field history-filters__status">
        <legend>{copy.filters.status}</legend>
        <div className="history-filters__status-options">
          {statusOptions.map((value) => (
            <label key={value} className="history-filters__status-option">
              <input
                type="checkbox"
                checked={draft.status.includes(value)}
                onChange={() => toggleStatus(value)}
              />
              <span
                className={`history-filters__status-dot history-filters__status-dot--${value}`}
                aria-hidden="true"
              />
              {copy.filters.statuses[value]}
            </label>
          ))}
        </div>
      </fieldset>

      <SelectField
        id={`${idPrefix}-language`}
        label={copy.filters.language}
        value={draft.language ?? ''}
        allLabel={copy.filters.all}
        options={facets.languages}
        onChange={(event) => changeScalar('language', event)}
      />
      <SelectField
        id={`${idPrefix}-source`}
        label={copy.filters.source}
        value={draft.source ?? ''}
        allLabel={copy.filters.allSources}
        options={facets.sources}
        onChange={(event) => changeScalar('source', event)}
      />

      <label
        className="history-filters__field history-filters__select-field"
        htmlFor={`${idPrefix}-date`}
      >
        <span>{copy.filters.dateRange}</span>
        <select
          id={`${idPrefix}-date`}
          value={draft.date}
          onChange={(event) =>
            onChange({
              ...draft,
              date: event.currentTarget.value as HistoryQuery['date'],
            })
          }
        >
          {dateOptions.map((value) => (
            <option key={value} value={value}>
              {copy.filters.dates[value]}
            </option>
          ))}
        </select>
      </label>

      <div className="history-filters__field history-filters__favorite">
        <span>{copy.filters.favoritesOnly}</span>
        <label className="history-filters__favorite-control">
          <input
            type="checkbox"
            checked={draft.favorite}
            onChange={(event) =>
              onChange({ ...draft, favorite: event.currentTarget.checked })
            }
          />
          <span>{copy.filters.showFavoritesOnly}</span>
        </label>
      </div>
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  allLabel,
  options,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  allLabel: string;
  options: readonly string[];
  onChange(event: ChangeEvent<HTMLSelectElement>): void;
}>) {
  return (
    <label
      className="history-filters__field history-filters__select-field"
      htmlFor={id}
    >
      <span>{label}</span>
      <select id={id} value={value} onChange={onChange}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
