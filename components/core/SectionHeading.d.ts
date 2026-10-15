import * as React from 'react';

/** Eyebrow + section title + lead paragraph, the standard opener for every page section. */
export interface SectionHeadingProps {
  /** ALL CAPS tracked label above the title */
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: 'light' | 'dark';
  align?: 'left' | 'center';
  /** Heading level — keep the page hierarchy correct */
  level?: 1 | 2 | 3;
  maxWidth?: number;
  style?: React.CSSProperties;
}
export function SectionHeading(props: SectionHeadingProps): JSX.Element;
