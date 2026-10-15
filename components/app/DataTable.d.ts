import * as React from 'react';

/** Product table — uppercase caption-size headers, hairline row rules, mono numeric columns. */
export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  /** Render this column in JetBrains Mono (IDs, amounts) */
  mono?: boolean;
}
export interface DataTableProps {
  columns?: TableColumn[];
  /** Cell values may be strings or nodes (e.g. a <Badge/>) */
  rows?: Array<Record<string, React.ReactNode> & { id?: string }>;
  tone?: 'dark' | 'light';
  compact?: boolean;
  /** Viewport width below which rows render as stacked cards instead of a
   *  table. Default 720. Pass 0 to keep a real table at every width. */
  cardsAt?: number;
}
export function DataTable(props: DataTableProps): JSX.Element;
