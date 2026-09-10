interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton — Elemento base com efeito de shimmer e pulsacao suave no tema escuro.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`rounded-xl bg-theme-surface/70 border border-white/[0.04] animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonCard — Placeholder retangular para cards genericos de estatisticas / visao geral.
 */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`p-5 rounded-2xl bg-theme-surface border border-theme-border/60 shadow-premium ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

/**
 * SkeletonBirdCard — Placeholder que replica perfeitamente o card de Ave (foto + anilha + badges).
 */
export function SkeletonBirdCard() {
  return (
    <div className="p-4 rounded-2xl bg-theme-surface border border-theme-border/60 flex items-center gap-3">
      <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </div>
  );
}

/**
 * SkeletonLotCard — Placeholder para lotes (Postura, Engorda, Pintinhos).
 */
export function SkeletonLotCard() {
  return (
    <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border/60 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </div>
  );
}
