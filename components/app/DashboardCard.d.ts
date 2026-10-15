import * as React from 'react';

/**
 * Panel used throughout the product interface — dark #111616 surface, hairline
 * white border, 18px radius, optional header row with a right-aligned action.
 *
 * @startingPoint section="Product" subtitle="Dashboard panel with header action" viewport="700x260"
 */
export interface DashboardCardProps {
  title?: React.ReactNode;
  /** Right-aligned control in the header (period select, "View all") */
  action?: React.ReactNode;
  children?: React.ReactNode;
  padding?: number;
  style?: React.CSSProperties;
  tone?: 'dark' | 'light';
}
export function DashboardCard(props: DashboardCardProps): JSX.Element;
