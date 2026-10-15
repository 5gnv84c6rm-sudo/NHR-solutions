import * as React from 'react';

/** Customer quote with a 5-star turquoise rating and an initials avatar (no photography). */
export interface TestimonialCardProps {
  quote: React.ReactNode;
  name: string;
  role?: string;
  company?: string;
  rating?: number;
  tone?: 'light' | 'dark';
}
export function TestimonialCard(props: TestimonialCardProps): JSX.Element;
