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
    /** Extra className */
    className?: string;
}

export const StatCard = ({ icon, label, value, subtitle, trend, className }: StatCardProps) => (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-4', className)}>
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
    </div>
);
