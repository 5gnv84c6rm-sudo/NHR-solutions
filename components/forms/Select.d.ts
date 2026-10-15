import * as React from 'react';

/** Native select styled to match Input — used in contact and app filter rows. */
export interface SelectProps {
  label?: string;
  id?: string;
  options?: Array<string | { value: string; label: string }>;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  tone?: 'light' | 'dark';
  helper?: string;
}
export function Select(props: SelectProps): JSX.Element;
