import * as React from 'react';

/** Square icon-only control — hamburger, close, app header actions. */
export interface IconButtonProps {
  children?: React.ReactNode;
  /** Required accessible name */
  label: string;
  tone?: 'light' | 'dark';
  size?: number;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}
export function IconButton(props: IconButtonProps): JSX.Element;
