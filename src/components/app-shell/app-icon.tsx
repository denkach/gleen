import { cx } from '@/lib/cx';

type AppIconProps = Readonly<{
  name: string;
  className?: string;
}>;

export function AppIcon({ name, className }: AppIconProps) {
  return (
    <svg className={cx('app-icon', className)} aria-hidden="true">
      <use href={`/app-icons.svg#${name}`} />
    </svg>
  );
}
