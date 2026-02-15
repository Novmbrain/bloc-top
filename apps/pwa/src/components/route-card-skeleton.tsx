'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface RouteCardSkeletonProps {
  count?: number
}

export function RouteCardSkeleton({ count = 5 }: RouteCardSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center p-3 bg-white rounded-xl shadow-sm animate-fade-in-up"
          style={{ animationDelay: `${index * 30}ms` }}
        >
          {/* 难度标签骨架 */}
          <Skeleton className="w-12 h-12 rounded-lg mr-3 flex-shrink-0" />

          {/* 线路信息骨架 */}
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-3 w-40 rounded-full" />
          </div>

          {/* 箭头骨架 */}
          <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}
