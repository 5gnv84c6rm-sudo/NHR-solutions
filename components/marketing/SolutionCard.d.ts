import * as React from 'react';

/**
 * One solution in the 3-up Solutions grid: Lucide icon in a rounded container,
 * Title Case heading, one-sentence description, "Learn More →".
 *
 * @startingPoint section="Marketing" subtitle="3-up solution card grid" viewport="700x300"
 */
export interface SolutionCardProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  href?: string;
  linkLabel?: string;
  tone?: 'light' | 'dark';
}
export function SolutionCard(props: SolutionCardProps): JSX.Element;
