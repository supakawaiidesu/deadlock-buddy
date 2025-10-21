import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

type PanelProps = HTMLAttributes<HTMLDivElement>;

export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={clsx('panel p-4', className)} {...props} />;
});
