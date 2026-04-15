import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ParticipantsTable } from '../../components/research/participants/ParticipantsTable';
import type { Participant, ResearchStatus } from '../../services/researchInProgress.service';
import { configService } from '../../services/api/config.service';

/**
 * Public read-only progress page. No auth required.
 * URL: /progress/:id
 */
export const PublicProgressPage = () => {
    const { id } = useParams<{ id: string }>();
    const [status, setStatus] = useState<ResearchStatus | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            try {
                const baseUrl = configService.getBaseUrl();
                const res = await fetch(`${baseUrl}/public/research/${id}/progress`);
                if (!res.ok) throw new Error(res.status === 404 ? 'Research not found' : 'Failed to load progress');
                const data = await res.json();
                setStatus(data.metrics);
                setParticipants(Array.isArray(data.participants) ? data.participants : data.participants?.data ?? []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error loading progress');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [id]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <img src="/EmotioCX-logo.svg" alt="EmotioCX" className="h-8 w-auto" />
                    <h1 className="text-2xl font-bold text-gray-900">Research Progress</h1>
                </div>

                {/* Metrics cards */}
                {status && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                        <div className="p-3 rounded-lg border border-gray-200 bg-white">
                            <p className="text-xs text-gray-500 mb-1">Estado</p>
                            <p className="text-sm font-semibold text-gray-900">{status.status?.value || '--'}</p>
                            <p className="text-[11px] text-gray-400">{status.status?.description || ''}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-gray-200 bg-white">
                            <p className="text-xs text-gray-500 mb-1">Modules</p>
                            <p className="text-sm font-semibold text-gray-900">{status.totalModules ?? '--'}</p>
                            <p className="text-[11px] text-gray-400">configured</p>
                        </div>
                        <div className="p-3 rounded-lg border border-gray-200 bg-white">
                            <p className="text-xs text-gray-500 mb-1">Participants</p>
                            <p className="text-sm font-semibold text-gray-900">{status.participants?.value || '--'}</p>
                            <p className="text-[11px] text-gray-400">{status.participants?.description || ''}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-gray-200 bg-white">
                            <p className="text-xs text-gray-500 mb-1">Completion Rate</p>
                            <p className="text-sm font-semibold text-gray-900">{status.completionRate?.value || '--'}</p>
                            <p className="text-[11px] text-gray-400">{status.completionRate?.description || ''}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-gray-200 bg-white">
                            <p className="text-xs text-gray-500 mb-1">Avg. Time</p>
                            <p className="text-sm font-semibold text-gray-900">{status.averageTime?.value || '--'}</p>
                            <p className="text-[11px] text-gray-400">{status.averageTime?.description || ''}</p>
                        </div>
                    </div>
                )}

                {/* Participants table — read-only (no delete, no actions) */}
                <ParticipantsTable
                    participants={participants}
                    onViewDetails={() => {}}
                    researchId={id || ''}
                    isLoading={isLoading}
                    readOnly
                />
            </div>
        </div>
    );
};
