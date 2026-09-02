import React from 'react';
import { useTranslation } from 'react-i18next';

// ---------------------------------------------------------------------------
// Step progress pill
// ---------------------------------------------------------------------------

export const StepProgressPill: React.FC<{ step: number; total: number; percent: number }> = ({ step, total, percent }) => {
    const { t } = useTranslation();
    return (
    <div className="inline-flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
        <span>{t('common.stepOf', { step, total })}</span>
        <div className="w-24 h-1.5 bg-blue-400 rounded-full overflow-hidden">
            <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${Math.min(percent, 100)}%` }}
            />
        </div>
        <span>{Math.min(percent, 100)}%</span>
    </div>
    );
};
