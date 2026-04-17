import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, ArrowRight } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { enterprisesService, type Enterprise, type EnterpriseResearch } from '../../services/enterprises.service';
import { researchService } from '../../services/research.service';
import { Button } from '../../components/ui/Button';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { useToast } from '../../hooks/useToast';

/** Status badge colors */
const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-600',
};

export const ClientsPage = () => {
    const navigate = useNavigate();
    const toast = useToast();

    const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
    const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string>('');
    const [selectedEnterprise, setSelectedEnterprise] = useState<Enterprise | null>(null);
    const [researches, setResearches] = useState<EnterpriseResearch[]>([]);
    const [loading, setLoading] = useState(true);

    // Load enterprises list
    useEffect(() => {
        enterprisesService.list().then(res => {
            setEnterprises(res.enterprises);
            if (res.enterprises.length > 0) {
                setSelectedEnterpriseId(res.enterprises[0].id);
            }
        }).catch(() => toast.error('Failed to load clients')).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount; toast is stable
    }, []);

    // Load selected enterprise details + researches
    useEffect(() => {
        if (!selectedEnterpriseId) return;
        const ent = enterprises.find(e => e.id === selectedEnterpriseId);
        setSelectedEnterprise(ent || null);

        enterprisesService.listResearches(selectedEnterpriseId)
            .then(res => setResearches(res.researches))
            .catch(() => setResearches([]));
    }, [selectedEnterpriseId, enterprises]);

    // Chart data: researches grouped by month with status counts
    const chartData = useMemo(() => {
        if (researches.length === 0) return [];

        const byMonth = new Map<string, { draft: number; active: number; completed: number }>();
        const sorted = [...researches].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        for (const r of sorted) {
            const d = new Date(r.created_at);
            const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            const bucket = byMonth.get(key) || { draft: 0, active: 0, completed: 0 };
            const status = r.status as keyof typeof bucket;
            if (status in bucket) {
                bucket[status]++;
            } else {
                bucket.draft++;
            }
            byMonth.set(key, bucket);
        }

        return Array.from(byMonth.entries()).map(([month, counts]) => ({
            month,
            ...counts,
        }));
    }, [researches]);

    // Stats for the info card
    const stats = useMemo(() => {
        const byStatus = { draft: 0, active: 0, completed: 0 };
        const types = new Set<string>();
        for (const r of researches) {
            const s = r.status as keyof typeof byStatus;
            if (s in byStatus) byStatus[s]++;
            if (r.research_type_name) types.add(r.research_type_name);
        }
        return { ...byStatus, total: researches.length, types: Array.from(types) };
    }, [researches]);

    // Latest projects (last 4)
    const latestProjects = useMemo(() => {
        return [...researches]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 4);
    }, [researches]);

    const handleDelete = async (research: EnterpriseResearch) => {
        if (!confirm(`Delete "${research.name}"?`)) return;
        try {
            await researchService.delete(research.id);
            setResearches(prev => prev.filter(r => r.id !== research.id));
            toast.success('Deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full p-6 space-y-6 animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-5 w-32 bg-gray-200 rounded" />
                        <div className="h-6 w-48 bg-gray-200 rounded" />
                    </div>
                    <div className="h-10 w-52 bg-gray-200 rounded" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-80 bg-gray-100 rounded-lg" />
                    <div className="h-80 bg-gray-100 rounded-lg" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                    <div className="h-28 bg-gray-100 rounded-lg" />
                    <div className="h-28 bg-gray-100 rounded-lg" />
                    <div className="h-28 bg-gray-100 rounded-lg" />
                    <div className="h-28 bg-gray-100 rounded-lg" />
                </div>
                <div className="h-48 bg-gray-100 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Clients</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Research overview per client
                    </p>
                </div>
                <div className="w-52 flex-shrink-0">
                    <CustomSelect
                        value={selectedEnterpriseId}
                        onChange={setSelectedEnterpriseId}
                        options={enterprises.map(ent => ({ value: ent.id, label: ent.name }))}
                        placeholder="Select client"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-6">
                {/* Chart + Client Info */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chart */}
                    <div className="lg:col-span-2 bg-white border border-gray-100 rounded-lg p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <h2 className="text-base font-semibold text-gray-900">
                                {selectedEnterprise?.name || 'Client'}
                            </h2>
                            <span className="text-xs text-gray-500">
                                {researches.length} research project{researches.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="completed" stackId="a" fill="#3b82f6" name="Completed" />
                                    <Bar dataKey="active" stackId="a" fill="#22c55e" name="Active" />
                                    <Bar dataKey="draft" stackId="a" fill="#eab308" name="Draft" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                                No research data available for this client
                            </div>
                        )}
                    </div>

                    {/* Client Info */}
                    <div className="bg-white border border-gray-100 rounded-lg p-5">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Client</h2>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">
                            {selectedEnterprise?.name || '—'}
                        </h3>

                        {selectedEnterprise?.description && (
                            <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                {selectedEnterprise.description}
                            </p>
                        )}

                        {stats.total > 0 && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center p-2 bg-yellow-50 rounded">
                                        <p className="text-lg font-bold text-yellow-700">{stats.draft}</p>
                                        <p className="text-[10px] text-yellow-600 uppercase font-medium">Draft</p>
                                    </div>
                                    <div className="text-center p-2 bg-green-50 rounded">
                                        <p className="text-lg font-bold text-green-700">{stats.active}</p>
                                        <p className="text-[10px] text-green-600 uppercase font-medium">Active</p>
                                    </div>
                                    <div className="text-center p-2 bg-blue-50 rounded">
                                        <p className="text-lg font-bold text-blue-700">{stats.completed}</p>
                                        <p className="text-[10px] text-blue-600 uppercase font-medium">Completed</p>
                                    </div>
                                </div>

                                {stats.types.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-medium mb-1">Research types</p>
                                        <div className="flex flex-wrap gap-1">
                                            {stats.types.map(t => (
                                                <span key={t} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {stats.total === 0 && !selectedEnterprise?.description && (
                            <p className="text-sm text-gray-400">No research history for this client yet.</p>
                        )}
                    </div>
                </div>

                {/* Latest projects */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-gray-900">Latest projects</h2>
                        <button
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            onClick={() => navigate('/research-history')}
                        >
                            See all <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {latestProjects.length === 0 ? (
                            <p className="col-span-4 text-center text-gray-400 text-sm py-8">No projects found</p>
                        ) : latestProjects.map(r => (
                            <div
                                key={r.id}
                                className="bg-white border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors cursor-pointer"
                                onClick={() => navigate(`/research/${r.id}/builder`)}
                            >
                                <p className="text-sm font-medium text-gray-900 truncate mb-1">{r.name}</p>
                                <p className="text-xs text-gray-500 mb-3">{r.research_type_name || 'Research'}</p>
                                <div className="flex justify-between items-center text-xs">
                                    <span className={`px-1.5 py-0.5 rounded capitalize ${STATUS_STYLES[r.status] || ''}`}>
                                        {r.status}
                                    </span>
                                    <span className="text-gray-400">
                                        {new Date(r.created_at).toLocaleDateString('es-CL')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Full research list */}
                <div className="bg-white border border-gray-100 rounded-lg">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <h2 className="text-base font-semibold text-gray-900">Research list</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase">
                                    <th className="px-4 py-3 font-medium">Name</th>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Researcher</th>
                                    <th className="px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {researches.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                            No researches found for this client
                                        </td>
                                    </tr>
                                ) : researches.map(r => (
                                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                                            {r.name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">
                                            {r.research_type_name || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[r.status] || STATUS_STYLES.draft}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {new Date(r.created_at).toLocaleDateString('es-CL')}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">
                                            {[r.creator_first_name, r.creator_last_name].filter(Boolean).join(' ') || r.creator_email || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="View"
                                                    onClick={() => navigate(`/research/${r.id}/builder`)}
                                                >
                                                    <Eye className="h-4 w-4 text-gray-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Delete"
                                                    onClick={() => handleDelete(r)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-400" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
