import * as React from 'react';

/**
 * Surface primitive: 18px radius, hairline border, whisper-soft shadow on
 * light; #111616 with a white-10% border on dark. Interactive cards lift 4px
 * and gain a turquoise border + glow.
 *
 * @startingPoint section="Core" subtitle="Light and dark surfaces with hover lift" viewport="700x220"
 */
export interface CardProps {
  children?: React.ReactNode;
  tone?: 'light' | 'dark';
  /** Enables the lift + turquoise glow hover state */
  interactive?: boolean;
  padding?: string | number;
  radius?: string | number;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  as?: keyof JSX.IntrinsicElements;
  /** id, aria-*, data-* and any other DOM attributes are forwarded to the element */
  [key: string]: any;
}
export function Card(props: CardProps): JSX.Element;
