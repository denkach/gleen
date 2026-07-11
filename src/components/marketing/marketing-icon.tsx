import type { SVGProps } from 'react';

const paths = {
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  chevron: <path d="m9 18 6-6-6-6" />,
} as const;

export type MarketingIconName = keyof typeof paths;

export function MarketingIcon({
  name,
  ...props
}: Readonly<{ name: MarketingIconName }> & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}
