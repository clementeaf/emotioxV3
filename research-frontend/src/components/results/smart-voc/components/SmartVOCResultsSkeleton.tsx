export const SmartVOCResultsSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-96 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg"></div>
        <div className="md:col-span-2 h-96 bg-white rounded-lg border border-gray-200"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-white rounded-lg border border-gray-200"></div>
        ))}
      </div>
    </div>
  );
};
