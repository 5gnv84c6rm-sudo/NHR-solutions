import * as React from 'react';

/**
 * Primary action element. Turquoise fill on black text is the one and only
 * primary treatment; secondary is a bordered transparent button that adapts to
 * light or dark sections.
 *
 * @startingPoint section="Core" subtitle="Primary, secondary and ghost buttons" viewport="700x180"
 */
export interface ButtonProps {
  children?: React.ReactNode;
  /** primary = turquoise fill + glow, secondary = bordered, ghost = text link */
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  /** Which section the button sits in — flips secondary/ghost colours */
  tone?: 'light' | 'dark';
  iconLeft?: React.ReactNode;
  /** Trailing icon; nudges 3px right on hover ("Learn More →") */
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  /** Renders an <a> instead of a <button> */
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
}
export function Button(props: ButtonProps): JSX.Element;
