export type MotionPolicyInput = Readonly<{
  reducedMotion: boolean;
  finePointer: boolean;
}>;

export function getMotionPolicy({
  reducedMotion,
  finePointer,
}: MotionPolicyInput) {
  return {
    enableGsap: !reducedMotion,
    enableCursor: !reducedMotion && finePointer,
  } as const;
}

type MatchMedia =
  ((query: string) => Pick<MediaQueryList, 'matches'>) | undefined;

export function getBrowserMotionPolicy(matchMedia: MatchMedia) {
  if (!matchMedia) {
    return getMotionPolicy({ reducedMotion: true, finePointer: false });
  }
  return getMotionPolicy({
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    finePointer: matchMedia('(pointer: fine)').matches,
  });
}
