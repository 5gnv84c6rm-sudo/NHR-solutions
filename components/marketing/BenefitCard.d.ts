import * as React from 'react';

/** "Why NHR Solution" unit — a single ALL-CAPS term (SMART, SIMPLE, SECURE…) over one sentence. */
export interface BenefitCardProps {
  icon?: React.ReactNode;
  /** One word, rendered ALL CAPS */
  term: string;
  description?: React.ReactNode;
  tone?: 'light' | 'dark';
}
export function BenefitCard(props: BenefitCardProps): JSX.Element;
