'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FlashcardsArtifact } from '@/lib/analysis-pipeline/artifact-schemas';
import type {
  ResultMutationState,
  ResultSaveState,
} from '@/lib/result-workspace/actions';
import { formatResultCopy, type ResultCopy } from '@/lib/result-workspace/copy';
import type {
  FlashcardRating,
  ResultUserState,
} from '@/lib/result-workspace/user-state';

import { AutosaveStatus } from './autosave-status';
import { useAutosave } from './use-autosave';

type ReviewAction = (input: unknown) => Promise<ResultMutationState>;

function currentReviewMap(
  reviews: ResultUserState['reviews'] | null,
  revision: string,
): Map<number, FlashcardRating> {
  return new Map(
    (reviews ?? [])
      .filter((review) => review.artifactRevision === revision)
      .map((review) => [review.cardIndex, review.rating]),
  );
}

function resumeCardIndex(
  cardCount: number,
  reviews: ReadonlyMap<number, FlashcardRating>,
  known: boolean,
): number {
  if (!known) return 0;
  const firstUnreviewed = Array.from(
    { length: cardCount },
    (_, cardIndex) => cardIndex,
  ).find((cardIndex) => !reviews.has(cardIndex));
  return firstUnreviewed ?? Math.max(0, cardCount - 1);
}

const reviewButtons = [
  {
    rating: 'again',
    className: 'again',
    label: 'flashcardsAgain',
    hint: 'flashcardsAgainHint',
    symbol: '↻',
  },
  {
    rating: 'hard',
    className: 'hard',
    label: 'flashcardsHard',
    hint: 'flashcardsHardHint',
    symbol: '◉',
  },
  {
    rating: 'got_it',
    className: 'got',
    label: 'flashcardsGotIt',
    hint: 'flashcardsGotItHint',
    symbol: '✓',
  },
] as const satisfies readonly {
  rating: FlashcardRating;
  className: string;
  label: keyof ResultCopy;
  hint: keyof ResultCopy;
  symbol: string;
}[];

export function FlashcardsTab({
  analysisId,
  artifact,
  onArtifactChange,
  revision,
  saveArtifact,
  saveFlashcardReview,
  reviews,
  copy,
}: Readonly<{
  analysisId: string;
  artifact: FlashcardsArtifact;
  onArtifactChange: (artifact: FlashcardsArtifact) => void;
  revision: string;
  saveArtifact: (input: unknown) => Promise<ResultSaveState>;
  saveFlashcardReview?: ReviewAction;
  reviews: ResultUserState['reviews'] | null;
  copy: ResultCopy;
}>) {
  const value = artifact;
  const setValue = (
    update: (current: FlashcardsArtifact) => FlashcardsArtifact,
  ) => onArtifactChange(update(value));
  const reviewsKnown = reviews !== null;
  const initialReviews = currentReviewMap(reviews, revision);
  const [index, setIndex] = useState(() =>
    resumeCardIndex(value.cards.length, initialReviews, reviewsKnown),
  );
  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewedCards, setReviewedCards] = useState<
    ReadonlyMap<number, FlashcardRating>
  >(() => initialReviews);
  const persistedReviews = useRef(new Map(initialReviews));
  const reviewRequestSequence = useRef(0);
  const latestReviewRequests = useRef(new Map<number, number>());
  const reviewQueues = useRef(new Map<number, Promise<void>>());
  const safeIndex = Math.max(0, Math.min(index, value.cards.length - 1));
  const card = value.cards[safeIndex];
  const save = useCallback(
    (content: FlashcardsArtifact, expectedUpdatedAt: string) =>
      saveArtifact({
        analysisId,
        expectedUpdatedAt,
        kind: 'flashcards',
        content,
      }),
    [analysisId, saveArtifact],
  );
  const autosave = useAutosave({ value, revision, save });
  const reviewUnavailableReason = !saveFlashcardReview
    ? copy.flashcardsReviewUnavailable
    : !autosave.isSaved
      ? autosave.status === 'saving'
        ? copy.stateSaving
        : autosave.status === 'conflict'
          ? copy.flashcardsReviewUnavailable
          : copy.stateNetworkError
      : '';
  const reviewRevision = useRef(autosave.revision);
  useEffect(() => {
    if (reviewRevision.current === autosave.revision) return;
    reviewRevision.current = autosave.revision;
    persistedReviews.current = new Map();
    latestReviewRequests.current.clear();
    reviewQueues.current.clear();
    setReviewedCards(new Map());
    setIndex(0);
    setFlipped(false);
    setReviewMessage('');
  }, [autosave.revision]);
  const move = (next: number) => {
    setIndex(next);
    setFlipped(false);
  };
  const reviewCard = (rating: FlashcardRating) => {
    if (!saveFlashcardReview || !autosave.isSaved) return;
    const cardIndex = safeIndex;
    const requestId = ++reviewRequestSequence.current;
    const artifactRevision = autosave.revision;
    latestReviewRequests.current.set(cardIndex, requestId);
    setReviewMessage('');
    setReviewedCards((current) => {
      const next = new Map(current);
      next.set(cardIndex, rating);
      return next;
    });
    move((cardIndex + 1) % value.cards.length);
    const persist = async () => {
      let result: ResultMutationState;
      try {
        result = await saveFlashcardReview({
          analysisId,
          artifactRevision,
          cardIndex,
          rating,
        });
      } catch {
        result = { status: 'error' };
      }
      if (reviewRevision.current !== artifactRevision) return;
      const isLatest =
        latestReviewRequests.current.get(cardIndex) === requestId;
      if (result.status === 'saved') {
        persistedReviews.current.set(cardIndex, rating);
        if (isLatest) setReviewMessage(copy.flashcardsReviewSaved);
        return;
      }
      if (!isLatest) return;
      setReviewedCards((current) => {
        const next = new Map(current);
        const persistedReview = persistedReviews.current.get(cardIndex);
        if (persistedReview) next.set(cardIndex, persistedReview);
        else next.delete(cardIndex);
        return next;
      });
      setReviewMessage(copy.flashcardsReviewFailed);
    };
    const pending = reviewQueues.current.get(cardIndex) ?? Promise.resolve();
    const queued = pending.then(persist);
    reviewQueues.current.set(cardIndex, queued);
    void queued.finally(() => {
      if (reviewQueues.current.get(cardIndex) === queued)
        reviewQueues.current.delete(cardIndex);
    });
  };

  return (
    <section className="result-flashcards" data-artifact="flashcards">
      <header className="result-flashcards-top">
        <div
          className="result-deck-progress"
          data-reviewed-count={reviewsKnown ? reviewedCards.size : 'unknown'}
          aria-label={`${copy.flashcardsDeckProgress}: ${reviewsKnown ? `${safeIndex + 1} / ${value.cards.length}. ${reviewedCards.size} ${copy.flashcardsReviewed}` : copy.flashcardsProgressUnknown}`}
        >
          <div className="result-deck-progress-row">
            <span>{copy.flashcardsDeckProgress}</span>
            <span>
              {reviewsKnown
                ? `${safeIndex + 1} / ${value.cards.length}`
                : copy.flashcardsProgressUnknown}
            </span>
          </div>
          <div className="result-deck-bar" aria-hidden="true">
            <span
              style={{
                width: reviewsKnown
                  ? `${((safeIndex + 1) / value.cards.length) * 100}%`
                  : '0%',
              }}
            />
          </div>
        </div>
        <span className="result-small-stat">
          {formatResultCopy(copy.flashcardsCardsCount, {
            count: value.cards.length,
          })}
        </span>
        <button
          type="button"
          className="result-artifact-edit-button"
          aria-pressed={editing}
          onClick={() => setEditing((current) => !current)}
        >
          {editing ? copy.flashcardsDoneEditing : copy.flashcardsEdit}
        </button>
      </header>

      {editing ? (
        <div className="result-flashcard-editor">
          {(['front', 'back'] as const).map((side) => (
            <label key={side}>
              <span>
                {side === 'front'
                  ? copy.flashcardsQuestion
                  : copy.flashcardsAnswer}
              </span>
              <textarea
                aria-label={
                  side === 'front'
                    ? copy.flashcardsQuestionField
                    : copy.flashcardsAnswerField
                }
                value={card[side]}
                rows={3}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    cards: current.cards.map((item, itemIndex) =>
                      itemIndex === safeIndex
                        ? { ...item, [side]: event.target.value }
                        : item,
                    ),
                  }))
                }
              />
            </label>
          ))}
          <AutosaveStatus {...autosave} copy={copy} />
        </div>
      ) : null}

      <div className="result-flash-stage">
        <button
          type="button"
          className="result-round-arrow"
          disabled={safeIndex === 0}
          onClick={() => move(safeIndex - 1)}
          aria-label={copy.flashcardsPrevious}
        >
          ‹
        </button>
        <div data-reduced-motion="instant" className="result-flashcard-wrap">
          <button
            type="button"
            aria-label={
              flipped ? copy.flashcardsShowQuestion : copy.flashcardsShowAnswer
            }
            aria-pressed={flipped}
            onClick={() => setFlipped((current) => !current)}
            className="result-flashcard motion-reduce:[&_[data-flashcard-scene]]:transition-none"
          >
            <span
              data-flashcard-scene=""
              className={`result-flashcard-scene [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}
            >
              <span
                aria-hidden={flipped}
                className="result-flashcard-face result-flashcard-front [backface-visibility:hidden]"
              >
                <span className="result-flashcard-symbol">✦</span>
                <span className="result-flashcard-number">
                  {copy.flashcardsCard}{' '}
                  <span>
                    {safeIndex + 1} / {value.cards.length}
                  </span>
                </span>
                <strong>{card.front}</strong>
              </span>
              <span
                aria-hidden={!flipped}
                className="result-flashcard-face result-flashcard-back [backface-visibility:hidden] [transform:rotateY(180deg)]"
              >
                <span className="result-flashcard-symbol">✦</span>
                <span className="result-flashcard-number">
                  {copy.flashcardsAnswer}
                </span>
                <p>{card.back}</p>
              </span>
            </span>
          </button>
        </div>
        <button
          type="button"
          className="result-round-arrow"
          disabled={safeIndex === value.cards.length - 1}
          onClick={() => move(safeIndex + 1)}
          aria-label={copy.flashcardsNext}
        >
          ›
        </button>
      </div>

      <div className="result-review-actions">
        {reviewButtons.map((item) => (
          <button
            key={item.rating}
            type="button"
            className={`result-review-button ${item.className}`}
            aria-label={
              reviewUnavailableReason
                ? `${String(copy[item.label])}. ${reviewUnavailableReason}`
                : String(copy[item.label])
            }
            disabled={Boolean(reviewUnavailableReason)}
            onClick={() => reviewCard(item.rating)}
          >
            <span>
              {item.symbol} {copy[item.label]}
            </span>
            <small>{copy[item.hint]}</small>
          </button>
        ))}
      </div>
      {reviewMessage ? (
        <p className="result-artifact-message" role="status" aria-live="polite">
          {reviewMessage}
        </p>
      ) : null}
    </section>
  );
}
