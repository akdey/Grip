import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-surface-subtle/80 border border-border-subtle/40 ${className}`}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC<{ height?: string; className?: string }> = ({
  height = 'h-36',
  className = '',
}) => {
  return (
    <div
      className={`animate-pulse rounded-3xl bg-surface/60 border border-border-subtle p-5 flex flex-col justify-between ${height} ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-24 rounded-lg bg-surface-subtle" />
        <div className="w-8 h-8 rounded-full bg-surface-subtle" />
      </div>
      <div className="space-y-2">
        <div className="h-7 w-36 rounded-xl bg-surface-subtle" />
        <div className="h-3 w-20 rounded-md bg-surface-subtle/60" />
      </div>
    </div>
  );
};

export const RowSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex items-center justify-between p-4 rounded-2xl bg-surface/40 border border-border-subtle/60"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-surface-subtle shrink-0" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded-md bg-surface-subtle" />
              <div className="h-2.5 w-16 rounded-md bg-surface-subtle/60" />
            </div>
          </div>
          <div className="space-y-1.5 flex flex-col items-end">
            <div className="h-3.5 w-16 rounded-md bg-surface-subtle" />
            <div className="h-2.5 w-10 rounded-md bg-surface-subtle/60" />
          </div>
        </div>
      ))}
    </div>
  );
};
