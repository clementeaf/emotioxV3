import { Calendar } from 'lucide-react';

interface FiltersProps {
    researchId: string;
}

export const Filters = ({ researchId: _researchId }: FiltersProps) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sticky top-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Filters</h3>
            
            <div className="space-y-4">
                {/* Time Range */}
                <div>
                    <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">
                        Time Range
                    </label>
                    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">Last 30 days</span>
                    </div>
                </div>

                {/* Participant Filter */}
                <div>
                    <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">
                        Participants
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option>All participants</option>
                    </select>
                </div>
            </div>
        </div>
    );
};
