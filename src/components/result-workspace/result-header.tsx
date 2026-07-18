import type { ReactNode } from 'react';

import type { ResultCopy } from '@/lib/result-workspace/copy';

function HeaderIcon({ name }: Readonly<{ name: 'heart' | 'share' }>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={
          name === 'heart'
            ? 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8z'
            : 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13'
        }
      />
    </svg>
  );
}

export function ResultHeader({
  title,
  subtitle,
  favorite,
  copy,
  onFavorite,
  onShare,
  status,
  navigation,
}: Readonly<{
  title: ReactNode;
  subtitle: string;
  favorite: boolean;
  copy: ResultCopy;
  onFavorite?: () => void;
  onShare?: () => void;
  status?: ReactNode;
  navigation?: ReactNode;
}>) {
  return (
    <header className="result-page-header">
      <div className="result-title-row">
        <div className="result-title-copy">
          {title}
          <p>{subtitle}</p>
          {status}
        </div>
        <div className="result-header-actions">
          {onFavorite ? (
            <button
              className="result-icon-button"
              type="button"
              aria-label={favorite ? copy.favoriteRemove : copy.favoriteAdd}
              aria-pressed={favorite}
              onClick={onFavorite}
            >
              <HeaderIcon name="heart" />
            </button>
          ) : null}
          {onShare ? (
            <button
              className="result-icon-button"
              type="button"
              aria-label={copy.shareTitle}
              onClick={onShare}
            >
              <HeaderIcon name="share" />
            </button>
          ) : null}
        </div>
      </div>
      {navigation}
    </header>
  );
}
