import { clsx } from 'clsx';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-[rgb(var(--neutral-rgb)/0.05)]',
        className,
      )}
    />
  );
}
