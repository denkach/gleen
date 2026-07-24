export const historyVisualCases = [
  'default',
  'duplicate',
  'filters',
  'sort',
  'partial',
  'empty',
  'search-empty',
  'filtered-empty',
  'rename',
  'delete',
] as const;

export type HistoryVisualCase = (typeof historyVisualCases)[number];

export const historyFixtureActions = [
  'success',
  'favorite-failure',
  'load-more',
] as const;

export type HistoryFixtureAction = (typeof historyFixtureActions)[number];
