export const resultArtifacts = [
  'overview',
  'summary',
  'flashcards',
  'timestamps',
  'transcript',
  'export',
] as const;

export type ResultArtifact = (typeof resultArtifacts)[number];

type LastStudyAction =
  'summary_opened' | 'flashcards_reviewed' | 'transcript_used' | null;

export type ResultRecommendationState = Readonly<{
  summaryVisited: boolean;
  reviewed: number;
  flashcardCount?: number | null;
  lastStudyAction?: LastStudyAction;
}>;

type BrowserWindow = Pick<
  Window,
  'location' | 'history' | 'addEventListener' | 'removeEventListener'
>;

function currentWindow(): BrowserWindow | null {
  return typeof window === 'undefined' ? null : window;
}

function availableSet(
  availableArtifacts: readonly ResultArtifact[] | undefined,
): ReadonlySet<ResultArtifact> {
  return new Set(availableArtifacts ?? resultArtifacts);
}

export function readResultArtifactHash(
  hash: string,
  availableArtifacts?: readonly ResultArtifact[],
): ResultArtifact {
  const artifact = hash.startsWith('#') ? hash.slice(1) : hash;
  if (
    !resultArtifacts.includes(artifact as ResultArtifact) ||
    !availableSet(availableArtifacts).has(artifact as ResultArtifact)
  ) {
    return 'overview';
  }
  return artifact as ResultArtifact;
}

function artifactUrl(browser: BrowserWindow, artifact: ResultArtifact) {
  return `${browser.location.pathname}${browser.location.search}#${artifact}`;
}

export function initializeResultArtifactNavigation(
  availableArtifacts?: readonly ResultArtifact[],
  browser: BrowserWindow | null = currentWindow(),
): ResultArtifact {
  if (!browser) return 'overview';

  const artifact = readResultArtifactHash(
    browser.location.hash,
    availableArtifacts,
  );
  browser.history.replaceState(
    browser.history.state,
    '',
    artifactUrl(browser, artifact),
  );
  return artifact;
}

export function navigateToResultArtifact(
  artifact: ResultArtifact,
  browser: BrowserWindow | null = currentWindow(),
): void {
  if (!browser) return;
  browser.history.pushState(
    browser.history.state,
    '',
    artifactUrl(browser, artifact),
  );
}

export function subscribeToResultArtifactNavigation(
  listener: (artifact: ResultArtifact) => void,
  availableArtifacts?: readonly ResultArtifact[],
  browser: BrowserWindow | null = currentWindow(),
): () => void {
  if (!browser) return () => undefined;

  const handleNavigation = () => {
    listener(readResultArtifactHash(browser.location.hash, availableArtifacts));
  };
  browser.addEventListener('hashchange', handleNavigation);
  browser.addEventListener('popstate', handleNavigation);

  return () => {
    browser.removeEventListener('hashchange', handleNavigation);
    browser.removeEventListener('popstate', handleNavigation);
  };
}

export function recommendNextArtifact(
  state: ResultRecommendationState,
): Extract<ResultArtifact, 'summary' | 'flashcards' | 'transcript'> {
  const activeFlashcardSession =
    state.lastStudyAction === 'flashcards_reviewed' &&
    state.reviewed > 0 &&
    (state.flashcardCount === null ||
      state.flashcardCount === undefined ||
      state.reviewed < state.flashcardCount);
  if (activeFlashcardSession) return 'flashcards';
  if (state.lastStudyAction === 'transcript_used') return 'transcript';
  if (state.summaryVisited && state.reviewed === 0) return 'flashcards';
  return 'summary';
}
