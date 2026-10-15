/** Thin turquoise progress bar — payroll run status, task completion, storage. */
export interface ProgressMeterProps {
  label?: string;
  /** 0–100 */
  value?: number;
  /** Overrides the printed value, e.g. "42 / 60" */
  valueLabel?: string;
  tone?: 'dark' | 'light';
  height?: number;
}
export function ProgressMeter(props: ProgressMeterProps): JSX.Element;
