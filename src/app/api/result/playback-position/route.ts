import { type NextRequest, NextResponse } from 'next/server';

import {
  persistOwnedPlaybackPosition,
  playbackPositionSchema,
} from '@/lib/result-workspace/playback-persistence-server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 400 });
  }
  const parsed = playbackPositionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ status: 'error' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ status: 'error' }, { status: 401 });
    }
    const result = await persistOwnedPlaybackPosition(
      supabase as never,
      data.user.id,
      parsed.data,
    );
    const status =
      result.status === 'saved'
        ? 202
        : result.status === 'conflict'
          ? 409
          : 503;
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
