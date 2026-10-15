import * as React from 'react';

/** One step of the How It Works timeline — numbered turquoise disc plus a connector rule. */
export interface StepCardProps {
  /** Two-digit string: "01", "02", "03" */
  number: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: 'light' | 'dark';
  /** Hides the trailing connector on the final step */
  last?: boolean;
  orientation?: 'horizontal' | 'vertical';
}
export function StepCard(props: StepCardProps): JSX.Element;
