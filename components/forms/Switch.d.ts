import * as React from 'react';

/** Toggle — pricing monthly/annual, app settings. Turquoise track when on. */
export interface SwitchProps {
  label?: React.ReactNode;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  tone?: 'light' | 'dark';
}
export function Switch(props: SwitchProps): JSX.Element;
