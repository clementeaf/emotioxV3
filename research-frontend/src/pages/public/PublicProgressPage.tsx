import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ParticipantsTable } from '../../components/research/participants/ParticipantsTable';
import type { Participant, ResearchStatus } from '../../services/researchInProgress.service';
import { configService } from '../../services/api/config.service';

const normalizeProgressResponse = (
    payload: unknown
): { metrics: ResearchStatus | null; participants: Participant[] } => {
    let parsedPayload = payload;

    if (
        parsedPayload &&
        typeof parsedPayload === 'object' &&
        'body' in parsedPayload &&
        typeof (parsedPayload as { body?: unknown }).body === 'string'
    ) {
        try {
            parsedPayload = JSON.parse((parsedPayload as { body: string }).body);
        } catch {
            parsedPayload = null;
        }
    }

    const root =
        parsedPayload &&
        typeof parsedPayload === 'object' &&
        'data' in parsedPayload &&
        (parsedPayload as { data?: unknown }).data &&
        typeof (parsedPayload as { data?: unknown }).data === 'object'
            ? (parsedPayload as { data: unknown }).data
            : parsedPayload;

    if (!root || typeof root !== 'object') {
        return { metrics: null, participants: [] };
    }

    const response = root as {
        metrics?: ResearchStatus;
        participants?: Participant[] | { data?: Participant[] };
    };

    const participants = Array.isArray(response.participants)
        ? response.participants
        : Array.isArray(response.participants?.data)
            ? response.participants.data
            : [];

    return {
        metrics: response.metrics ?? null,
        participants,
    };
};

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
                const normalized = normalizeProgressResponse(data);
                setStatus(normalized.metrics);
                setParticipants(normalized.participants);
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
                    <img src={`${import.meta.env.BASE_URL}EmotioCX-logo.svg`} alt="EmotioCX" className="h-8 w-auto" />
                    <h1 className="text-2xl font-bold text-gray-900">
                        Research Progress
                        {status?.researchName ? ` - ${status.researchName}` : ''}
                    </h1>
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
