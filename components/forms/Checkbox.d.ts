import * as React from 'react';

/** Checkbox with a turquoise filled box and black tick. */
export interface CheckboxProps {
  label?: React.ReactNode;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  tone?: 'light' | 'dark';
  id?: string;
}
export function Checkbox(props: CheckboxProps): JSX.Element;
