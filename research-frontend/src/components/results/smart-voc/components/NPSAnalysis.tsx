import type { SmartVOCMetrics, SmartVOCTimeSeriesData } from '../../../../services/smartVOC.service';

interface NPSAnalysisProps {
    npsData: SmartVOCMetrics;
    monthlyData: Array<{
        month: string;
        promoters: number;
        neutrals: number;
        detractors: number;
        npsRatio: number;
    }>;
    timeSeriesData: SmartVOCTimeSeriesData[];
}

export const NPSAnalysis = ({ npsData }: NPSAnalysisProps) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">NPS Analysis</h2>
            <div className="grid grid-cols-3 gap-4">
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
        </div>
    );
};
