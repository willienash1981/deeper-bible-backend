import { cn } from '@/lib/utils/cn';

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn("animate-pulse bg-gray-200 rounded", className)} />
  );
}

export function BookGridSkeleton() {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <LoadingSkeleton className="h-16 w-full rounded-lg" />
          <LoadingSkeleton className="h-4 w-3/4 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function ChapterGridSkeleton() {
  return (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      {Array.from({ length: 32 }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-12 w-12 rounded-lg" />
      ))}
    </div>
  );
}

export function VerseSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <LoadingSkeleton className="h-4 w-full" />
          <LoadingSkeleton className="h-4 w-5/6" />
          <LoadingSkeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}