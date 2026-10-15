import * as React from 'react';

/** Text field. Turquoise focus border plus a 3px turquoise-20% ring; errors switch to --nhr-danger. */
export interface InputProps {
  label?: string;
  id?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  helper?: string;
  /** Error message — also sets aria-invalid */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  tone?: 'light' | 'dark';
  iconLeft?: React.ReactNode;
  /** Renders a <textarea> */
  multiline?: boolean;
  rows?: number;
}
export function Input(props: InputProps): JSX.Element;
