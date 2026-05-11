import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Info, XCircle, X, Bell } from 'lucide-react';
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
    info: { bg: 'bg-blue-50 border-blue-200', icon: Info, iconColor: 'text-blue-500', dot: 'bg-blue-500' },
    warning: { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500', dot: 'bg-amber-500' },
    critical: { bg: 'bg-red-50 border-red-200', icon: XCircle, iconColor: 'text-red-500', dot: 'bg-red-500' },
};

export const AlertsBar = ({ researchId }: { researchId: string }) => {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

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

    const worstSeverity = alerts.some(a => a.severity === 'critical') ? 'critical'
        : alerts.some(a => a.severity === 'warning') ? 'warning' : 'info';
    const dotColor = SEVERITY_STYLES[worstSeverity].dot;

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(prev => !prev)}
                className="relative p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={`${alerts.length} alert${alerts.length !== 1 ? 's' : ''}`}
            >
                <Bell className="h-4 w-4" />
                <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-white`} />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute top-full right-0 mt-1 z-20 w-80 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700">Alerts ({alerts.length})</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {alerts.slice(0, 5).map(alert => {
                                const style = SEVERITY_STYLES[alert.severity];
                                const Icon = style.icon;
                                return (
                                    <div key={alert.id} className={`flex items-start gap-2 px-3 py-2.5 border-b border-gray-50 ${style.bg}`}>
                                        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${style.iconColor}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-900">{alert.title}</p>
                                            <p className="text-[10px] text-gray-600 mt-0.5">{alert.message}</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); dismiss.mutate(alert.id); }}
                                            className="p-0.5 text-gray-400 hover:text-gray-600 rounded shrink-0"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
