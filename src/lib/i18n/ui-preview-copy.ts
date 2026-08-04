import type { UiPreviewCopy } from './messages/shared';

export const uiPreviewTabAccents = [
  'neutral',
  'summary',
  'flashcards',
  'timestamps',
  'export',
] as const;

export type SerializableUiPreviewCopy = Omit<UiPreviewCopy, 'exampleTabs'> & {
  exampleTabs: Readonly<Record<(typeof uiPreviewTabAccents)[number], string>>;
};

export function materializeUiPreviewCopy(
  copy: UiPreviewCopy,
): SerializableUiPreviewCopy {
  const { exampleTabs, ...serializableCopy } = copy;
  return {
    ...serializableCopy,
    exampleTabs: Object.fromEntries(
      uiPreviewTabAccents.map((accent) => [accent, exampleTabs(accent)]),
    ) as Record<(typeof uiPreviewTabAccents)[number], string>,
  };
}
