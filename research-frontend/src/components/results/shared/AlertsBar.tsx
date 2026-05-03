import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Info, XCircle, X } from 'lucide-react';
import apiClient from '../../../services/api/client';

interface ResearchAlert {
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    createdAt: string;
    dismissed: boolean;
}

const SEVERITY_STYLES = {
    info: { bg: 'bg-blue-50 border-blue-200', icon: Info, iconColor: 'text-blue-500' },
    warning: { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500' },
    critical: { bg: 'bg-red-50 border-red-200', icon: XCircle, iconColor: 'text-red-500' },
};

export const AlertsBar = ({ researchId }: { researchId: string }) => {
    const queryClient = useQueryClient();

    const { data: alerts = [] } = useQuery({
        queryKey: ['alerts', researchId],
        queryFn: async () => {
            const res = await apiClient.get<{ alerts: ResearchAlert[] }>(
                `/analytics/research/${researchId}/alerts`
            );
            return res.alerts.filter(a => !a.dismissed);
        },
        staleTime: 30_000,
    });

    const dismiss = useMutation({
        mutationFn: (alertId: string) =>
            apiClient.post(`/analytics/research/${researchId}/alerts/${alertId}/dismiss`, {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts', researchId] });
        },
    });

    if (alerts.length === 0) return null;

    return (
        <div className="space-y-2">
            {alerts.slice(0, 3).map(alert => {
                const style = SEVERITY_STYLES[alert.severity];
                const Icon = style.icon;
                return (
                    <div key={alert.id} className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${style.bg}`}>
                        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
                        </div>
                        <button
                            onClick={() => dismiss.mutate(alert.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded flex-shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
