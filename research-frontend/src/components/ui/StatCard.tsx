import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface StatCardProps {
    /** Icon element (e.g. lucide icon) */
    icon?: ReactNode;
    /** Metric label */
    label: string;
    /** Metric value (number or formatted string) */
    value: string | number;
    /** Optional subtitle below the value */
    subtitle?: string;
    /** Optional trend indicator */
    trend?: { value: string; positive?: boolean };
    /** Tooltip text on hover */
    tooltip?: string;
    /** Use compact size */
    compact?: boolean;
    /** Extra className */
    className?: string;
}

export const StatCard = ({ icon, label, value, subtitle, trend, tooltip, compact, className }: StatCardProps) => {
    if (compact) {
        return (
            <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 relative group', className)}>
                <span className="text-gray-400">{icon}</span>
                <span className="text-[10px] text-gray-500 font-medium">{label}</span>
                <span className="text-xs font-bold text-slate-900">{value}</span>
                {tooltip && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
                        {tooltip}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800" />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn('bg-white rounded-xl border border-gray-200 p-4 relative group', className)}>
            <div className="flex items-center gap-2 text-gray-500 mb-2">
                {icon}
                <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            {trend && (
                <p className={cn('text-xs font-medium mt-1', trend.positive ? 'text-green-600' : 'text-red-500')}>
                    {trend.value}
                </p>
            )}
            {tooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
                    {tooltip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                </div>
            )}
        </div>
    );
};
