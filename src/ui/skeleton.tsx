import { clsx } from 'clsx';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-[rgba(255,255,255,0.05)]',
        className,
      )}
    />
  );
}
