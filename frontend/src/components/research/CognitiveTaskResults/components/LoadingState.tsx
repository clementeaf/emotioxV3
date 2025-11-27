'use client';

import { Card } from '@/components/ui/Card';

// Componente Skeleton para CognitiveTaskResults
export const CognitiveTaskResultsSkeleton = () => {
  return (
    <div className="flex gap-8">
      <div className="flex-1 space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="w-64 h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Question Cards Skeleton */}
        {[1, 2, 3].map((index) => (
          <Card key={index} className="p-6 space-y-4">
            {/* Question Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-24 h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="flex gap-4 border-b">
              {['Comment', 'Mood', 'Sentiment', 'Themes', 'Key'].map((tab) => (
                <div key={tab} className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>

            {/* Content Area Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Panel */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="p-3 border rounded-lg">
                      <div className="w-full h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="w-3/4 h-3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Panel */}
              <div className="space-y-4">
                <div className="w-48 h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="space-y-3">
                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="w-full h-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters Sidebar Skeleton */}
      <div className="w-80 shrink-0 mt-[52px]">
        <Card className="p-6 space-y-6">
          <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>

          {/* Update Prompt */}
          <div className="p-4 bg-gray-100 rounded-lg space-y-3">
            <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Filter Categories */}
          {['Country', 'Age range', 'Gender', 'Education level', 'User ID', 'Participants'].map((category) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="space-y-1">
                {[1, 2].map((item) => (
                  <div key={item} className="w-full h-3 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = "Cargando resultados de tareas cognitivas..." }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="w-64 h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>

      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="w-64 h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="w-48 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};
