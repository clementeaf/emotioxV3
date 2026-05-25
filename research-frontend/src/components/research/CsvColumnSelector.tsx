import { useState } from 'react';
import { type CsvColumnInfo } from '../../utils/documentParser';

interface CsvColumnSelectorProps {
    fileName: string;
    columnInfo: CsvColumnInfo;
    onSelect: (columnIndex: number) => void;
    onCancel: () => void;
}

/**
 * Shows detected CSV columns with preview data.
 * User picks which column contains the text to analyze.
 */
export const CsvColumnSelector = ({ fileName, columnInfo, onSelect, onCancel }: CsvColumnSelectorProps) => {
    const [selected, setSelected] = useState<number | null>(null);

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Select column to analyze</h4>
                <p className="text-xs text-gray-500">
                    <span className="font-medium">{fileName}</span> has {columnInfo.headers.length} columns
                    and {columnInfo.totalRows} rows. Select the column that contains the text you want to analyze.
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
                                        onClick={() => setSelected(i)}
                                        className={`px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors min-w-[140px] ${
                                            selected === i
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        {header || `Column ${i + 1}`}
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
                                            onClick={() => setSelected(ci)}
                                            className={`px-3 py-1.5 text-xs cursor-pointer transition-colors max-w-[200px] truncate ${
                                                selected === ci
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

            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={selected === null}
                    onClick={() => selected !== null && onSelect(selected)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Use "{selected !== null ? (columnInfo.headers[selected] || `Column ${selected + 1}`) : '...'}"
                </button>
            </div>
        </div>
    );
};
