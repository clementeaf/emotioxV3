import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SmartVOCMetrics, SmartVOCTimeSeriesData } from '../../../../services/smartVOC.service';
import { NPSChart, TrustFlowChart } from '../charts';

interface NPSAnalysisProps {
    npsData: SmartVOCMetrics;
    monthlyData: Array<{
        month: string;
        promoters: number;
        neutrals: number;
        detractors: number;
        npsRatio: number;
        date?: string;
    }>;
    timeSeriesData: SmartVOCTimeSeriesData[];
}

export const NPSAnalysis = ({ npsData, monthlyData, timeSeriesData }: NPSAnalysisProps) => {
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('month');
    const [trustTimeRange, setTrustTimeRange] = useState<'24h' | 'week' | 'month'>('24h');

    // Transform timeSeriesData for TrustFlowChart
    const trustFlowData = timeSeriesData.map(item => ({
        stage: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        nps: item.nps || 0,
        nev: item.nev || 0,
        timestamp: item.date
    }));

    return (
        <div className="space-y-6">
            {/* NPS Overview Cards */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">NPS Analysis</h2>
                    <div className="relative inline-block">
                        <select
                            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer pr-8"
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as 'today' | 'week' | 'month')}
                        >
                            <option value="today">Today</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700 font-medium">Promoters</p>
                        <p className="text-2xl font-bold text-green-900 mt-2">{npsData.promoters}%</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-700 font-medium">Neutrals</p>
                        <p className="text-2xl font-bold text-yellow-900 mt-2">{npsData.neutrals}%</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700 font-medium">Detractors</p>
                        <p className="text-2xl font-bold text-red-900 mt-2">{npsData.detractors}%</p>
                    </div>
                </div>

                {/* NPS Chart */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <NPSChart data={monthlyData} timeRange={timeRange} />
                </div>
            </div>

            {/* Trust Relationship Flow */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Trust Relationship Flow</h2>
                        <p className="text-sm text-gray-500 mt-1">Customer's perception about service in time</p>
                    </div>
                    <select
                        className="text-sm border rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
                        value={trustTimeRange}
                        onChange={(e) => setTrustTimeRange(e.target.value as '24h' | 'week' | 'month')}
                    >
                        <option value="24h">Last 24 hours</option>
                        <option value="week">Last week</option>
                        <option value="month">Last month</option>
                    </select>
                </div>
                <TrustFlowChart data={trustFlowData} timeRange={trustTimeRange} className="h-64" />
            </div>
        </div>
    );
};
