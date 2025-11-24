import type { Research } from '../../services/research.service';

interface ResearchSettingsViewProps {
    research: Research;
}

/**
 * Vista de configuración del research
 * Muestra información general del research (solo lectura por ahora)
 */
export const ResearchSettingsView = ({ research }: ResearchSettingsViewProps) => {
    return (
        <div className="space-y-6">
            {/* Research Info Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">General Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Research Name</label>
                        <input
                            type="text"
                            value={research.name}
                            readOnly
                            className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Research Type</label>
                        <input
                            type="text"
                            value={research.research_type_name || ''}
                            readOnly
                            className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm p-2 border"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={research.description || ''}
                            readOnly
                            rows={3}
                            className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm p-2 border"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

