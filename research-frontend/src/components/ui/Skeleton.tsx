import { cn } from '../../lib/utils';

interface SkeletonProps {
    className?: string;
}

/**
 * Base skeleton block with pulse animation (neutral gray palette).
 */
export const Skeleton = ({ className }: SkeletonProps) => (
    <div className={cn('animate-pulse rounded-lg bg-gray-200', className)} />
);

/**
 * Skeleton layout matching a research list card while data loads.
 */
export const ResearchCardSkeleton = () => (
    <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-72" />
                <div className="flex items-center gap-6">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-28" />
                </div>
            </div>
            <div className="ml-4 flex items-center gap-2">
                <Skeleton className="h-10 w-20 rounded-lg" />
                <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
        </div>
    </div>
);

/**
 * Skeleton for the research builder sidebar while research metadata loads.
 */
export const SidebarSkeleton = () => (
    <div className="flex h-full w-64 flex-col overflow-hidden rounded-lg border-r border-gray-100 bg-white">
        <div className="flex-shrink-0 border-b border-gray-100 p-4">
            <Skeleton className="mx-auto h-8 w-24" />
        </div>
        <div className="space-y-3 border-b border-gray-100 p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-40" />
        </div>
        <div className="flex-1 space-y-6 p-4">
            <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-36" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-44" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-full" />
            </div>
        </div>
        <div className="flex-shrink-0 border-t border-gray-100 p-4">
            <Skeleton className="h-9 w-full rounded-lg" />
        </div>
    </div>
);

/**
 * Skeleton for the builder main content area while the research loads.
 */
export const BuilderContentSkeleton = () => (
    <div className="h-full w-full space-y-6 p-6">
        <div className="flex items-center justify-between">
            <div className="space-y-2">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <div className="space-y-4">
            <div className="space-y-4 rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-8 w-8 rounded" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="space-y-4 rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-8 w-8 rounded" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
            </div>
        </div>
    </div>
);

/**
 * Skeleton for the participant details drawer while details are fetched.
 */
export const DrawerDetailsSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2 rounded-lg bg-gray-50 p-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-20" />
                </div>
            ))}
        </div>
        <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-gray-100 p-3">
                    <div className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                </div>
            ))}
        </div>
    </div>
);

/**
 * Skeleton for a single module template card.
 */
export const ModuleCardSkeleton = () => (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex gap-1">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-6 rounded" />
            </div>
        </div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12 rounded-full" />
        </div>
    </div>
);

interface ModulesGridSkeletonProps {
    count?: number;
}

/**
 * Grid of module card skeletons for the modules library page.
 */
export const ModulesGridSkeleton = ({ count = 6 }: ModulesGridSkeletonProps) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(count)].map((_, i) => (
            <ModuleCardSkeleton key={i} />
        ))}
    </div>
);
