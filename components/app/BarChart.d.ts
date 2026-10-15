/** Vertical bar chart — single turquoise series fading downward. Values are illustrative. */
export interface BarDatum {
  label: string;
  value: number;
  /** Renders the bar in neutral grey (e.g. a projected or inactive period) */
  muted?: boolean;
}
export interface BarChartProps {
  data?: BarDatum[];
  height?: number;
  tone?: 'dark' | 'light';
  showAxis?: boolean;
  /** Suffix printed above each bar: "%", "h" */
  unit?: string;
}
export function BarChart(props: BarChartProps): JSX.Element;
