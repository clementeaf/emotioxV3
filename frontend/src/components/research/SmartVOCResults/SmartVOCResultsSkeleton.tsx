'use client';

import { Card } from '@/components/ui/Card';

/**
 * Componente Skeleton para SmartVOCResults
 */
export function SmartVOCResultsSkeleton() {
  return (
    <div className="pt-4 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="p-6 h-96">
            <div className="space-y-4 animate-pulse">
              <div className="w-32 h-6 bg-gray-200 rounded"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
              <div className="w-full h-48 bg-gray-200 rounded"></div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="p-6 h-96">
            <div className="space-y-4 animate-pulse">
              <div className="w-48 h-6 bg-gray-200 rounded"></div>
              <div className="w-full h-64 bg-gray-200 rounded"></div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((index) => (
          <Card key={index} className="p-6">
            <div className="space-y-4 animate-pulse">
              <div className="w-40 h-6 bg-gray-200 rounded"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
              <div className="w-full h-32 bg-gray-200 rounded"></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-8 mt-8">
        <div className="flex-1 space-y-6">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Card key={index} className="p-6">
              <div className="space-y-4 animate-pulse">
                <div className="w-64 h-6 bg-gray-200 rounded"></div>
                <div className="w-full h-32 bg-gray-200 rounded"></div>
              </div>
            </Card>
          ))}
        </div>

        <div className="w-80 shrink-0">
          <Card className="p-4">
            <div className="space-y-4 animate-pulse">
              <div className="w-24 h-6 bg-gray-200 rounded"></div>
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="space-y-2">
                  <div className="w-32 h-4 bg-gray-200 rounded"></div>
                  <div className="w-full h-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

