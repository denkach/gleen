'use client';

import { useCallback, useRef, useState } from 'react';
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
  reviews: ResultUserState['reviews'];
  copy: ResultCopy;
}>) {
  const value = artifact;
  const setValue = (
    update: (current: FlashcardsArtifact) => FlashcardsArtifact,
  ) => onArtifactChange(update(value));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewedCards, setReviewedCards] = useState<
    ReadonlyMap<number, FlashcardRating>
  >(
    () =>
      new Map(
        reviews
          .filter((review) => review.artifactRevision === revision)
          .map((review) => [review.cardIndex, review.rating]),
      ),
  );
  const reviewRequestSequence = useRef(0);
  const latestReviewRequests = useRef(new Map<number, number>());
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
  const move = (next: number) => {
    setIndex(next);
    setFlipped(false);
  };
  const reviewCard = (rating: FlashcardRating) => {
    const cardIndex = safeIndex;
    const previousRating = reviewedCards.get(cardIndex);
    const requestId = ++reviewRequestSequence.current;
    latestReviewRequests.current.set(cardIndex, requestId);
    setReviewMessage('');
    setReviewedCards((current) => {
      const next = new Map(current);
      next.set(cardIndex, rating);
      return next;
    });
    move((cardIndex + 1) % value.cards.length);
    if (!saveFlashcardReview) return;
    void saveFlashcardReview({
      analysisId,
      artifactRevision: revision,
      cardIndex,
      rating,
    })
      .then((result) => {
        if (latestReviewRequests.current.get(cardIndex) !== requestId) return;
        if (result.status === 'saved') {
          setReviewMessage(copy.flashcardsReviewSaved);
          return;
        }
        setReviewedCards((current) => {
          const next = new Map(current);
          if (previousRating) next.set(cardIndex, previousRating);
          else next.delete(cardIndex);
          return next;
        });
        setReviewMessage(copy.flashcardsReviewFailed);
      })
      .catch(() => {
        if (latestReviewRequests.current.get(cardIndex) !== requestId) return;
        setReviewedCards((current) => {
          const next = new Map(current);
          if (previousRating) next.set(cardIndex, previousRating);
          else next.delete(cardIndex);
          return next;
        });
        setReviewMessage(copy.flashcardsReviewFailed);
      });
  };

  return (
    <section className="result-flashcards" data-artifact="flashcards">
      <header className="result-flashcards-top">
        <div className="result-deck-progress">
          <div className="result-deck-progress-row">
            <span>{copy.flashcardsDeckProgress}</span>
            <span>
              {reviewedCards.size} / {value.cards.length}{' '}
              {copy.flashcardsReviewed}
            </span>
          </div>
          <div className="result-deck-bar" aria-hidden="true">
            <span
              style={{
                width: `${(reviewedCards.size / value.cards.length) * 100}%`,
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
          <AutosaveStatus {...autosave} />
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
            aria-label={String(copy[item.label])}
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
