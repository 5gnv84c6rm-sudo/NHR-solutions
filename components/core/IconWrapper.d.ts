import * as React from 'react';

/** Rounded container that holds a Lucide glyph at the top of feature and solution cards. */
export interface IconWrapperProps {
  children?: React.ReactNode;
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  /** Turquoise border + glow — drive from the parent card's hover state */
  highlight?: boolean;
  style?: React.CSSProperties;
}
export function IconWrapper(props: IconWrapperProps): JSX.Element;
