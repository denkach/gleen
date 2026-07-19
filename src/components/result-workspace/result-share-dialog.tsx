'use client';

import { useState } from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { trackResultEvent } from '@/lib/analytics/result-events';
import type {
  ResultMutationState,
  ResultShareState,
} from '@/lib/result-workspace/actions';
import type { ResultCopy } from '@/lib/result-workspace/copy';

type CreateShareAction = (input: unknown) => Promise<ResultShareState>;
type RevokeShareAction = (input: unknown) => Promise<ResultMutationState>;

export function ResultShareDialog({
  analysisId,
  copy,
  createShare,
  onOpenChange,
  open,
  revokeShare,
}: Readonly<{
  analysisId: string;
  copy: ResultCopy;
  createShare: CreateShareAction;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  revokeShare: RevokeShareAction;
}>) {
  const [url, setUrl] = useState('');
  const [pending, setPending] = useState<'create' | 'revoke' | null>(null);
  const [message, setMessage] = useState('');

  const create = async () => {
    if (pending) return;
    setPending('create');
    setMessage('');
    try {
      const result = await createShare({ analysisId });
      if (result.status !== 'created') {
        setMessage(copy.shareError);
        return;
      }
      setUrl(result.url);
      setMessage('');
      trackResultEvent({ name: 'result_share_changed', action: 'created' });
    } catch {
      setMessage(copy.shareError);
    } finally {
      setPending(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(copy.shareCopied);
      trackResultEvent({ name: 'result_share_changed', action: 'copied' });
    } catch {
      setMessage(copy.shareError);
    }
  };

  const revoke = async () => {
    if (pending) return;
    setPending('revoke');
    setMessage('');
    try {
      const result = await revokeShare({ analysisId });
      if (result.status !== 'saved') {
        setMessage(copy.shareError);
        return;
      }
      setUrl('');
      setMessage(copy.shareRevoked);
      trackResultEvent({ name: 'result_share_changed', action: 'revoked' });
    } catch {
      setMessage(copy.shareError);
    } finally {
      setPending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="result-share-dialog"
        title={copy.shareTitle}
        description={copy.sharePublicReadOnly}
        closeLabel={copy.sheetClose}
      >
        {url ? (
          <div className="result-share-link">
            <label>
              <span>{copy.sharePublicLink}</span>
              <input aria-label={copy.sharePublicLink} value={url} readOnly />
            </label>
            <div className="result-share-actions">
              <button type="button" onClick={() => void copyLink()}>
                {copy.shareCopyLink}
              </button>
              <button
                type="button"
                disabled={pending === 'revoke'}
                onClick={() => void revoke()}
              >
                {pending === 'revoke' ? copy.shareRevoking : copy.shareRevoke}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="result-share-create"
            type="button"
            disabled={pending === 'create'}
            onClick={() => void create()}
          >
            {pending === 'create' ? copy.shareCreating : copy.shareCreate}
          </button>
        )}
        {message ? (
          <p
            className="result-artifact-message"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
