import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

export const ResearchHistoryPage = () => {
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

    // Chart data: one point per research, ordered by date
    const chartData = useMemo(() => {
        return [...researches]
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map(r => ({
                name: r.name.length > 20 ? r.name.slice(0, 20) + '...' : r.name,
                fullName: r.name,
                date: new Date(r.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' }),
            }));
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
                        <div className="h-6 w-48 bg-gray-200 rounded" />
                        <div className="h-4 w-80 bg-gray-100 rounded" />
                    </div>
                    <div className="h-10 w-52 bg-gray-200 rounded" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-72 bg-gray-100 rounded-lg" />
                    <div className="h-72 bg-gray-100 rounded-lg" />
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
                    <h1 className="text-xl font-bold text-gray-900">Research&apos;s History</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        The performance of recent customer&apos; studies based on the Perceived Value Map (cost-benefit) benchmark
                    </p>
                </div>
                {/* Client selector */}
                <div className="w-52 flex-shrink-0">
                    <CustomSelect
                        value={selectedEnterpriseId}
                        onChange={setSelectedEnterpriseId}
                        options={enterprises.map(ent => ({ value: ent.id, label: ent.name }))}
                        placeholder="Change client"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Top row: Chart + Who Is */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chart */}
                    <div className="lg:col-span-2 bg-white border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-base font-semibold text-gray-900">
                                {selectedEnterprise?.name || 'Client'}
                            </h2>
                            <span className="text-xs text-gray-500">
                                {researches.length} research project{researches.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex gap-4 mb-3 text-xs">
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-0.5 bg-red-500 inline-block" /> Visual Attractiveness
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-0.5 bg-blue-500 inline-block" /> Benefit Association
                            </span>
                        </div>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        labelFormatter={(_label, payload) => {
                                            const item = payload?.[0]?.payload;
                                            return item?.fullName || _label;
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="attractiveness" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Visual Attractiveness" />
                                    <Line type="monotone" dataKey="benefit" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Benefit Association" />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                                No research data available for this client
                            </div>
                        )}
                    </div>

                    {/* Who Is */}
                    <div className="bg-white border border-gray-100 rounded-lg p-4">
                        <h2 className="text-sm font-semibold text-gray-900 mb-1">Who is</h2>
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            {selectedEnterprise?.name || '—'}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {selectedEnterprise?.description || 'No description available for this client.'}
                        </p>
                    </div>
                </div>

                {/* List of research */}
                <div className="bg-white border border-gray-100 rounded-lg">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <h2 className="text-base font-semibold text-gray-900">List of research</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase">
                                    <th className="px-4 py-3 font-medium">Research&apos;s name</th>
                                    <th className="px-4 py-3 font-medium">Name</th>
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
                                            {r.enterprise_name}
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
