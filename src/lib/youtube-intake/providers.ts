export type IntakeErrorCode =
  | 'invalid_url'
  | 'video_unavailable'
  | 'video_restricted'
  | 'live_not_ready'
  | 'unsupported_duration'
  | 'transcript_unavailable'
  | 'transcript_language_unavailable'
  | 'provider_configuration'
  | 'provider_unavailable'
  | 'session_expired'
  | 'persistence_failure';

export type VideoMetadata = Readonly<{
  videoId: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  thumbnailUrl: string;
  captionAvailable: boolean;
}>;

export type TranscriptSegment = Readonly<{
  text: string;
  offsetMs: number;
  durationMs: number;
}>;

export type VideoMetadataResult =
  | Readonly<{ ok: true; data: VideoMetadata }>
  | Readonly<{
      ok: false;
      code: Extract<
        IntakeErrorCode,
        | 'video_unavailable'
        | 'video_restricted'
        | 'live_not_ready'
        | 'unsupported_duration'
        | 'provider_configuration'
        | 'provider_unavailable'
      >;
    }>;

export type TranscriptResult =
  | Readonly<{
      ok: true;
      language: string;
      segments: readonly TranscriptSegment[];
    }>
  | Readonly<{
      ok: false;
      code: Extract<
        IntakeErrorCode,
        | 'transcript_unavailable'
        | 'transcript_language_unavailable'
        | 'provider_configuration'
        | 'provider_unavailable'
      >;
    }>;

export type VideoMetadataProvider = Readonly<{
  getVideo(videoId: string): Promise<VideoMetadataResult>;
}>;

export type TranscriptProvider = Readonly<{
  getNativeTranscript(
    canonicalUrl: string,
    preferredLanguage?: string,
  ): Promise<TranscriptResult>;
}>;
