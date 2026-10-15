import * as React from 'react';

/** Small pill label — "MOST POPULAR", plan tags, in-app status chips. */
export interface BadgeProps {
  children?: React.ReactNode;
  tone?: 'turquoise' | 'soft' | 'outline' | 'dark' | 'success' | 'warning' | 'danger' | 'neutral';
  /** Tracked-out ALL CAPS treatment for marketing labels */
  uppercase?: boolean;
  icon?: React.ReactNode;
}
export function Badge(props: BadgeProps): JSX.Element;
