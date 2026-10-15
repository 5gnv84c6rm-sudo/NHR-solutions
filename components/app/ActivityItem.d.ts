import * as React from 'react';

/** One row in Recent Activities / Notifications — icon, title, meta line, timestamp. */
export interface ActivityItemProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** Short relative time: "12m", "2h" */
  time?: string;
  tone?: 'dark' | 'light';
  divider?: boolean;
}
export function ActivityItem(props: ActivityItemProps): JSX.Element;
