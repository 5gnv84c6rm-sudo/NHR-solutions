import * as React from 'react';

/**
 * Plan card. The featured plan renders on a dark surface with a turquoise
 * border, glow and an 8px lift so it dominates the row.
 *
 * @startingPoint section="Marketing" subtitle="Three-plan pricing row" viewport="700x420"
 */
export interface PricingCardProps {
  /** Plan name, rendered ALL CAPS: Starter / Professional / Business */
  name: string;
  blurb?: string;
  /** Placeholder content — keep in a data array: "£29", "Custom" */
  price: React.ReactNode;
  period?: string;
  features?: string[];
  featured?: boolean;
  ctaLabel?: string;
  badgeLabel?: string;
  onSelect?: () => void;
  tone?: 'light' | 'dark';
}
export function PricingCard(props: PricingCardProps): JSX.Element;
