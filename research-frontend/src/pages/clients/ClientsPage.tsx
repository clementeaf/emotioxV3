import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, ArrowRight } from 'lucide-react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis,
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

/** Gradient colors for scatter dots */
const SCATTER_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#ec4899'];

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

    // Scatter chart data — each research is a point
    const scatterData = useMemo(() => {
        return researches.map((r, i) => ({
            name: r.name.length > 25 ? r.name.slice(0, 25) + '...' : r.name,
            fullName: r.name,
            id: r.id,
            // Placeholder values — will be replaced with real Eye Tracking metrics
            benefitAssociation: 0,
            visualAttractiveness: 0,
            colorIndex: i % SCATTER_COLORS.length,
        }));
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
                <div className="h-40 bg-gray-800/10 rounded-lg" />
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
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Home</span>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">Clients</span>
                </div>
            </div>

            {/* Sub-header with title + selector */}
            <div className="flex items-center justify-between px-6 py-3 flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Clients</h1>
                    <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
                        <span className="font-medium">{selectedEnterprise?.name}:</span> What is the best design in the dimension of Affordance &amp; Signifiers&apos; benchmark?
                    </p>
                </div>
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
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
                {/* Section 2 + 3: Benchmark Chart + How to understand */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Benchmark Chart */}
                    <div className="lg:col-span-2 bg-white border border-gray-100 rounded-lg p-5">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">
                            Affordances &amp; Signifiers&apos; Benchmark
                        </h2>
                        {scatterData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        type="number"
                                        dataKey="benefitAssociation"
                                        name="Benefit Association"
                                        tick={{ fontSize: 11 }}
                                        label={{ value: 'Benefit Association (BA)', position: 'bottom', offset: 20, fontSize: 12, fill: '#6b7280' }}
                                    />
                                    <YAxis
                                        type="number"
                                        dataKey="visualAttractiveness"
                                        name="Visual Attractiveness"
                                        tick={{ fontSize: 11 }}
                                        label={{ value: 'Visual Attractiveness (VA)', angle: -90, position: 'insideLeft', offset: 0, fontSize: 12, fill: '#6b7280' }}
                                    />
                                    <ZAxis range={[80, 80]} />
                                    <Tooltip
                                        content={({ payload }) => {
                                            if (!payload?.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
                                                    <p className="font-medium text-gray-900">{d.fullName}</p>
                                                    <p className="text-gray-500">BA: {d.benefitAssociation} | VA: {d.visualAttractiveness}</p>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Scatter data={scatterData}>
                                        {scatterData.map((entry, i) => (
                                            <Cell key={entry.id} fill={SCATTER_COLORS[i % SCATTER_COLORS.length]} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[320px] flex items-center justify-center text-gray-400 text-sm">
                                No research data available for this client
                            </div>
                        )}
                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 mt-3">
                            {scatterData.map((entry, i) => (
                                <div key={entry.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                                        style={{ backgroundColor: SCATTER_COLORS[i % SCATTER_COLORS.length] }}
                                    />
                                    {entry.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* How to understand */}
                    <div className="bg-white border border-gray-100 rounded-lg p-5">
                        <h2 className="text-sm font-semibold text-gray-900 mb-1">How to understand the</h2>
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            Affordances &amp; Signifiers&apos; Benchmark?
                        </h3>
                        <p className="text-sm font-medium text-blue-600 mb-4">
                            Here you can find all the winners from every project.
                        </p>
                        <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                            <p>
                                Each point is the position where the associated benefits (Benefit Association, BA) are projected against the visual attractiveness (Visual Attractiveness, VA).
                            </p>
                            <p>
                                BA aims to establish the product&apos;s ability to communicate its value by leaving a mark on the user. In other words, it conveys the message of its benefits efficiently.
                            </p>
                            <p>
                                VA aims to establish the product&apos;s ability to attract attention, be seen and interact with. In other words, the fewer obstacles you put in to get attention, the more effective it is.
                            </p>
                            <p>
                                The focus must be &quot;ease of communicating their value&quot; and while the point is closer to the center, there is an average performance.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section 4: Best option */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 flex items-center justify-between text-white">
                    <div className="space-y-2 max-w-md">
                        <h2 className="text-xl font-bold">The best option&apos;s performance</h2>
                        <p className="text-sm text-gray-300">
                            Based on the performance of all the options evaluated in the different studies, the option that stood out was highlighted.
                        </p>
                        {latestProjects.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 border-white text-white hover:bg-white/10"
                                onClick={() => navigate(`/research/${latestProjects[0].id}/builder/results`)}
                            >
                                See Research
                            </Button>
                        )}
                    </div>
                    <div className="w-40 h-40 rounded-lg bg-white/10 flex items-center justify-center text-gray-400 text-xs">
                        Best option image
                    </div>
                </div>

                {/* Section 5: Latest projects */}
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
                        ) : latestProjects.map((r, i) => (
                            <div
                                key={r.id}
                                className="bg-white border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors cursor-pointer"
                                onClick={() => navigate(`/research/${r.id}/builder`)}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">
                                        {['📊', '📈', '📉', '📋'][i % 4]}
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 truncate">{r.name}</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">Visual Attractiveness</p>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '0%' }} />
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-2">
                                    <span className={`px-1.5 py-0.5 rounded text-xs capitalize ${STATUS_STYLES[r.status] || ''}`}>
                                        {r.status}
                                    </span>
                                    <span>{new Date(r.created_at).toLocaleDateString('es-CL')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 5b: Full research list */}
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
