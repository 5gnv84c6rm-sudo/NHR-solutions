import * as React from 'react';

/** Turquoise 800-weight number over a plain caption — the trust-section unit. */
export interface StatProps {
  /** Short form: "10K+", "99.9%", "24/7" */
  value: React.ReactNode;
  label: React.ReactNode;
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
}
export function Stat(props: StatProps): JSX.Element;
