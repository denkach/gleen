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
  rpc(
    functionName: 'create_owned_result_share' | 'revoke_owned_result_share',
    arguments_: Readonly<{ p_analysis_id: string; p_token?: string }>,
  ): PromiseLike<SupabaseResult>;
}>;

const publicShareRowSchema = z
  .object({ analysis_id: z.uuid(), user_id: z.uuid() })
  .strict();

type OwnerKey = Readonly<{ userId: string; analysisId: string }>;

export function createSupabaseResultShareRepository(
  client: SupabaseResultShareClient,
  createToken: () => string = createResultShareToken,
) {
  return {
    async createOwned({ analysisId }: OwnerKey): Promise<string | null> {
      try {
        const token = resultShareTokenSchema.parse(createToken());
        const result = await client.rpc('create_owned_result_share', {
          p_analysis_id: analysisId,
          p_token: token,
        });
        if (result.error) return null;
        return resultShareTokenSchema.safeParse(result.data).data ?? null;
      } catch {
        return null;
      }
    },

    async revokeOwned({ analysisId }: OwnerKey): Promise<boolean> {
      try {
        const result = await client.rpc('revoke_owned_result_share', {
          p_analysis_id: analysisId,
        });
        return !result.error && result.data === true;
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
