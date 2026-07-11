import { Children, Fragment, isValidElement, type ReactNode } from 'react';

export function hasRenderableChildren(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === Fragment
    ) {
      return hasRenderableChildren(child.props.children);
    }
    return child !== null && child !== undefined && typeof child !== 'boolean';
  });
}
