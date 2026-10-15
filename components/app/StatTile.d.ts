import * as React from 'react';

/** KPI tile: label, big 800-weight number, signed turquoise delta, period caption. */
export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  /** Signed delta string: "+24.8%" */
  delta?: string;
  direction?: 'up' | 'down';
  icon?: React.ReactNode;
  /** Period context: "vs last month" */
  caption?: string;
  tone?: 'dark' | 'light';
}
export function StatTile(props: StatTileProps): JSX.Element;
