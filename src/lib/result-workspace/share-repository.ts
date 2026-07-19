import 'server-only';

import { z } from 'zod';

import {
  createResultShareToken,
  projectPublicResult,
  resultShareTokenSchema,
  type PublicResultProjection,
} from './share';

type SupabaseResult = Readonly<{
  data: unknown;
  error: Readonly<{ code?: string }> | null;
}>;

type Query = Readonly<{
  select(columns?: string): Query;
  insert(values: Record<string, unknown>): Query;
  update(values: Record<string, unknown>): Query;
  eq(column: string, value: unknown): Query;
  is(column: string, value: unknown): Query;
  order(column: string, options: Readonly<{ ascending: boolean }>): Query;
  limit(count: number): Query;
  maybeSingle(): PromiseLike<SupabaseResult>;
  then<TResult1 = SupabaseResult, TResult2 = never>(
    onfulfilled?:
      ((value: SupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}>;

export type SupabaseResultShareClient = Readonly<{
  from(
    table: 'analysis_intakes' | 'analysis_shares' | 'analysis_artifacts',
  ): Query;
}>;

const shareRowSchema = z
  .object({
    token: resultShareTokenSchema,
    revoked_at: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();

const publicShareRowSchema = z
  .object({ analysis_id: z.uuid(), user_id: z.uuid() })
  .strict();

type OwnerKey = Readonly<{ userId: string; analysisId: string }>;

async function ownsAnalysis(
  client: SupabaseResultShareClient,
  input: OwnerKey,
): Promise<boolean> {
  const result = await client
    .from('analysis_intakes')
    .select('id')
    .eq('id', input.analysisId)
    .eq('user_id', input.userId)
    .limit(1)
    .maybeSingle();
  return !result.error && result.data !== null;
}

function readToken(result: SupabaseResult): string | null {
  if (result.error) return null;
  const parsed = z
    .object({ token: resultShareTokenSchema })
    .safeParse(result.data);
  return parsed.success ? parsed.data.token : null;
}

export function createSupabaseResultShareRepository(
  client: SupabaseResultShareClient,
  createToken: () => string = createResultShareToken,
) {
  return {
    async createOwned(input: OwnerKey): Promise<string | null> {
      try {
        if (!(await ownsAnalysis(client, input))) return null;
        const currentResult = await client
          .from('analysis_shares')
          .select('token,revoked_at')
          .eq('analysis_id', input.analysisId)
          .eq('user_id', input.userId)
          .limit(1)
          .maybeSingle();
        if (currentResult.error) return null;
        if (currentResult.data !== null) {
          const current = shareRowSchema.safeParse(currentResult.data);
          if (!current.success) return null;
          if (current.data.revoked_at === null) return current.data.token;
          const token = resultShareTokenSchema.parse(createToken());
          return readToken(
            await client
              .from('analysis_shares')
              .update({ token, revoked_at: null })
              .eq('analysis_id', input.analysisId)
              .eq('user_id', input.userId)
              .eq('token', current.data.token)
              .select('token')
              .maybeSingle(),
          );
        }
        const token = resultShareTokenSchema.parse(createToken());
        return readToken(
          await client
            .from('analysis_shares')
            .insert({
              token,
              analysis_id: input.analysisId,
              user_id: input.userId,
              revoked_at: null,
            })
            .select('token')
            .maybeSingle(),
        );
      } catch {
        return null;
      }
    },

    async revokeOwned(input: OwnerKey): Promise<boolean> {
      try {
        if (!(await ownsAnalysis(client, input))) return false;
        const result = await client
          .from('analysis_shares')
          .update({ revoked_at: new Date().toISOString() })
          .eq('analysis_id', input.analysisId)
          .eq('user_id', input.userId)
          .is('revoked_at', null)
          .select('token')
          .maybeSingle();
        return readToken(result) !== null;
      } catch {
        return false;
      }
    },
  };
}

export async function loadPublicResultProjection(
  client: SupabaseResultShareClient,
  inputToken: unknown,
): Promise<PublicResultProjection | null> {
  const token = resultShareTokenSchema.safeParse(inputToken);
  if (!token.success) return null;
  try {
    const shareResult = await client
      .from('analysis_shares')
      .select('analysis_id,user_id')
      .eq('token', token.data)
      .is('revoked_at', null)
      .limit(1)
      .maybeSingle();
    if (shareResult.error) return null;
    const share = publicShareRowSchema.safeParse(shareResult.data);
    if (!share.success) return null;

    const sourceResult = await client
      .from('analysis_intakes')
      .select(
        'youtube_video_id,title,channel_title,duration_seconds,thumbnail_url,transcript_language',
      )
      .eq('id', share.data.analysis_id)
      .eq('user_id', share.data.user_id)
      .limit(1)
      .maybeSingle();
    if (sourceResult.error || sourceResult.data === null) return null;

    const artifactsResult = await client
      .from('analysis_artifacts')
      .select('kind,content,updated_at')
      .eq('analysis_id', share.data.analysis_id)
      .eq('user_id', share.data.user_id)
      .eq('status', 'ready')
      .order('kind', { ascending: true });
    if (artifactsResult.error) return null;
    return projectPublicResult(sourceResult.data, artifactsResult.data);
  } catch {
    return null;
  }
}
