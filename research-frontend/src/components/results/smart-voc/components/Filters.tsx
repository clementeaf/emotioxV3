// Interface for Filters component props
// Will be expanded when filters are implemented
interface FiltersProps {
  // Add props here when implementing filters
  researchId?: string;
}

export const Filters = (_props: FiltersProps) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <h3 className="font-semibold mb-2">Filters</h3>
    <p className="text-sm text-gray-500">Filters will be implemented here</p>
  </div>
);
