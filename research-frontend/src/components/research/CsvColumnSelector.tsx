import { useState } from 'react';
import { type CsvColumnInfo } from '../../utils/documentParser';

interface CsvColumnSelectorProps {
    fileName: string;
    columnInfo: CsvColumnInfo;
    onSelect: (columnIndices: number[]) => void;
    onCancel: () => void;
}

/**
 * Shows detected CSV columns with preview data.
 * User picks one or more columns to analyze (each becomes a separate analysis).
 */
export const CsvColumnSelector = ({ fileName, columnInfo, onSelect, onCancel }: CsvColumnSelectorProps) => {
    const [selected, setSelected] = useState<Set<number>>(new Set());

    const toggle = (i: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i); else next.add(i);
            return next;
        });
    };

    const selectedNames = Array.from(selected)
        .sort((a, b) => a - b)
        .map(i => columnInfo.headers[i] || `Column ${i + 1}`);

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Select columns to analyze</h4>
                <p className="text-xs text-gray-500">
                    <span className="font-medium">{fileName}</span> has {columnInfo.headers.length} columns
                    and {columnInfo.totalRows} rows. Select the columns you want to analyze. Each column will be analyzed separately.
                </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-max text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="w-10 px-3 py-2" />
                                {columnInfo.headers.map((header, i) => (
                                    <th
                                        key={i}
                                        onClick={() => toggle(i)}
                                        className={`px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors min-w-[140px] ${
                                            selected.has(i)
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(i)}
                                                onChange={() => toggle(i)}
                                                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            {header || `Column ${i + 1}`}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {columnInfo.preview.map((row, ri) => (
                                <tr key={ri} className="hover:bg-gray-50">
                                    <td className="px-3 py-1.5 text-xs text-gray-400">{ri + 1}</td>
                                    {row.map((cell, ci) => (
                                        <td
                                            key={ci}
                                            onClick={() => toggle(ci)}
                                            className={`px-3 py-1.5 text-xs cursor-pointer transition-colors max-w-[200px] truncate ${
                                                selected.has(ci)
                                                    ? 'bg-blue-50/50 text-blue-800 font-medium'
                                                    : 'text-gray-700'
                                            }`}
                                        >
                                            {cell || <span className="text-gray-300 italic">empty</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {columnInfo.totalRows > 5 && (
                <p className="text-[11px] text-gray-400 text-right">
                    Showing 5 of {columnInfo.totalRows} rows
                </p>
            )}

            <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-gray-500">
                    {selected.size > 0 ? (
                        <span>{selected.size} column{selected.size > 1 ? 's' : ''} selected: {selectedNames.join(', ')}</span>
                    ) : (
                        <span>Click columns to select</span>
                    )}
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={selected.size === 0}
                        onClick={() => onSelect(Array.from(selected).sort((a, b) => a - b))}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Analyze {selected.size > 0 ? `${selected.size} column${selected.size > 1 ? 's' : ''}` : '...'}
                    </button>
                </div>
            </div>
        </div>
    );
};
