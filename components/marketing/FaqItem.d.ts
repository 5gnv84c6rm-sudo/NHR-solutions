import * as React from 'react';

/** Accordion row. Animates grid-template-rows 0fr→1fr over 320ms; chevron rotates 180°. */
export interface FaqItemProps {
  question: React.ReactNode;
  answer: React.ReactNode;
  open?: boolean;
  onToggle?: () => void;
  tone?: 'light' | 'dark';
  /** Used to build the panel id for aria-controls */
  id?: string;
}
export function FaqItem(props: FaqItemProps): JSX.Element;
