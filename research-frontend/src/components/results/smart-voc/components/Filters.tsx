import { useState, useEffect } from 'react';
import { FileDown } from 'lucide-react';
import * as analyticsService from '../../../../services/analytics.service';
import { triggerCsvDownload } from '../../../../utils/csvDownload';

const DEMOGRAPHIC_LABELS: Record<string, string> = {
    age: 'Age',
    country: 'Country',
    gender: 'Gender',
    educationLevel: 'Education Level',
    annualIncome: 'Annual Income',
    employmentStatus: 'Employment Status',
    dailyHoursOnline: 'Daily Hours Online',
    technicalProficiency: 'Technical Proficiency',
};

function getDemographicLabel(key: string): string {
    return DEMOGRAPHIC_LABELS[key] ?? key;
}

interface FiltersProps {
    researchId?: string;
}

export const Filters = ({ researchId }: FiltersProps) => {
    const [data, setData] = useState<analyticsService.DemographicResponsesResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!researchId) {
            setData(null);
            setIsLoading(false);
            return;
        }
        let cancelled = false;
        analyticsService.getDemographicResponses(researchId)
            .then((result: analyticsService.DemographicResponsesResult) => {
                if (!cancelled) setData(result);
            })
            .catch(() => {
                if (!cancelled) setData({ participants: [], demographicTypes: [] });
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => { cancelled = true; };
    }, [researchId]);

    const handleDownloadCSV = (): void => {
        if (!researchId || !data || data.participants.length === 0) return;
        const headers = ['participant_id', ...data.demographicTypes.map(getDemographicLabel)];
        const rows = data.participants.map((p: analyticsService.DemographicParticipant) => {
            const cells = [
                String(p.participantId ?? '').replace(/"/g, '""'),
                ...data.demographicTypes.map((t: string) => String(p.demographics[t] ?? '').replace(/"/g, '""')),
            ];
            return cells.map((c) => `"${c}"`).join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        triggerCsvDownload(csv, `demographics-${researchId}.csv`);
    };

    if (!researchId) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold mb-2">Filtros</h3>
                <p className="text-sm text-gray-500">Selecciona un estudio para ver las respuestas demográficas.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold mb-2">Respuestas demográficas</h3>
                <div className="h-32 bg-gray-100 rounded animate-pulse" />
            </div>
        );
    }

    const hasData = data && data.participants.length > 0 && data.demographicTypes.length > 0;

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Respuestas demográficas</h3>
                {hasData && (
                    <button
                        type="button"
                        onClick={handleDownloadCSV}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                        title="Descargar CSV"
                    >
                        <FileDown className="w-3.5 h-3.5" />
                        Descargar CSV
                    </button>
                )}
            </div>
            {!hasData ? (
                <p className="text-sm text-gray-500">No hay respuestas demográficas para este estudio.</p>
            ) : (
                <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 border-b sticky top-0">
                            <tr>
                                <th className="p-2 text-left font-medium text-gray-600">Participante</th>
                                {data.demographicTypes.map((t: string) => (
                                    <th key={t} className="p-2 text-left font-medium text-gray-600">
                                        {getDemographicLabel(t)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.participants.map((p: analyticsService.DemographicParticipant) => (
                                <tr key={p.participantId} className="hover:bg-gray-50">
                                    <td className="p-2 font-mono text-xs text-gray-700">
                                        {p.participantId}
                                    </td>
                                    {data.demographicTypes.map((t: string) => (
                                        <td key={t} className="p-2 text-gray-700">
                                            {p.demographics[t] ?? '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
