import { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { Trash2, Plus } from 'lucide-react';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

export interface RankingItemsEditorProps {
    component: ComponentConfig;
    value: string;
    onChange: (value: string) => void;
    /** Screener: Single Choice — one option row, no add/delete/randomize */
    singleChoiceLocked?: boolean;
    /** Screener: Multiple Choice — default minimum option rows (e.g. 3) */
    screenerMultipleChoiceMinOptions?: number;
}

type RankingItem = {
    id: string;
    label: string;
    qualification?: 'qualify' | 'disqualify';
};

/**
 * Editor for ranking items — lets the researcher add/edit/remove items to rank
 */
export const RankingItemsEditor = ({
    component,
    value,
    onChange,
    singleChoiceLocked = false,
    screenerMultipleChoiceMinOptions,
}: RankingItemsEditorProps) => {
    const buildInitialState = (): { items: RankingItem[]; randomize: boolean } => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                // New format: { items, randomize }
                if (parsed && !Array.isArray(parsed) && parsed.items) {
                    return { items: parsed.items as RankingItem[], randomize: !!parsed.randomize };
                }
                // Legacy format: plain array
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return { items: parsed as RankingItem[], randomize: false };
                }
            } catch { /* not JSON */ }
        }
        const items = component.rankingConfig?.items;
        if (items && items.length > 0) return { items, randomize: false };
        if (singleChoiceLocked) {
            return {
                items: [{ id: `item-${crypto.randomUUID()}`, label: '', qualification: 'qualify' }],
                randomize: false,
            };
        }
        const blankItems: RankingItem[] = [];
        for (let i = 0; i < 3; i++) {
            blankItems.push({ id: `item-${crypto.randomUUID()}`, label: '', qualification: 'qualify' });
        }
        return {
            items: blankItems,
            randomize: false,
        };
    };

    const [localItems, setLocalItems] = useState<RankingItem[]>(() => buildInitialState().items);
    const [randomize, setRandomize] = useState<boolean>(() => buildInitialState().randomize);
    const prevMultipleModeRef = useRef<boolean>(false);

    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (parsed && !Array.isArray(parsed) && parsed.items) {
                    let items = parsed.items as RankingItem[];
                    if (singleChoiceLocked && items.length > 1) {
                        items = [items[0]];
                        onChange(JSON.stringify({ items, randomize: false }));
                    }
                    setLocalItems(items);
                    setRandomize(singleChoiceLocked ? false : !!parsed.randomize);
                } else if (Array.isArray(parsed)) {
                    let items = parsed as RankingItem[];
                    if (singleChoiceLocked && items.length > 1) {
                        items = [items[0]];
                        onChange(JSON.stringify({ items, randomize: false }));
                    }
                    setLocalItems(items);
                    setRandomize(false);
                }
            } catch { /* keep current */ }
        }
    }, [value, singleChoiceLocked, onChange]);

    useEffect(() => {
        if (!singleChoiceLocked) {
            return;
        }
        setRandomize(false);
        setLocalItems((prev) => {
            if (prev.length <= 1) {
                return prev;
            }
            const trimmed = [prev[0]];
            onChange(JSON.stringify({ items: trimmed, randomize: false }));
            return trimmed;
        });
    }, [singleChoiceLocked, onChange]);

    useEffect(() => {
        const isMultiple = screenerMultipleChoiceMinOptions === 3;
        const becameMultiple = isMultiple && !prevMultipleModeRef.current;
        prevMultipleModeRef.current = isMultiple;
        if (singleChoiceLocked || !isMultiple || !becameMultiple) {
            return;
        }
        setLocalItems((prev) => {
            if (prev.length >= 3) {
                return prev;
            }
            const need = 3 - prev.length;
            const next = [...prev];
            for (let i = 0; i < need; i++) {
                next.push({ id: `item-${crypto.randomUUID()}`, label: '', qualification: 'qualify' });
            }
            onChange(JSON.stringify({ items: next, randomize: false }));
            setRandomize(false);
            return next;
        });
    }, [singleChoiceLocked, screenerMultipleChoiceMinOptions, onChange]);

    const persist = (items: RankingItem[], rand: boolean) => {
        onChange(JSON.stringify({ items, randomize: rand }));
    };

    const handleLabelChange = (itemId: string, label: string) => {
        const updated = localItems.map(item => item.id === itemId ? { ...item, label } : item);
        setLocalItems(updated);
        persist(updated, randomize);
    };

    const handleQualificationChange = (itemId: string, qualification: 'qualify' | 'disqualify') => {
        const updated = localItems.map(item => item.id === itemId ? { ...item, qualification } : item);
        setLocalItems(updated);
        persist(updated, randomize);
    };

    const handleAdd = () => {
        if (singleChoiceLocked) {
            return;
        }
        const newItem: RankingItem = { id: `item-${crypto.randomUUID()}`, label: '', qualification: 'qualify' };
        const updated = [...localItems, newItem];
        setLocalItems(updated);
        persist(updated, randomize);
    };

    const handleDelete = (itemId: string) => {
        if (singleChoiceLocked) {
            return;
        }
        const updated = localItems.filter(item => item.id !== itemId);
        setLocalItems(updated);
        persist(updated, randomize);
    };

    const handleRandomizeChange = (checked: boolean) => {
        if (singleChoiceLocked) {
            return;
        }
        setRandomize(checked);
        persist(localItems, checked);
    };

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
                {component.label}
            </label>
            <div className="space-y-3">
                {localItems.map((item) => {
                    const canDelete = localItems.length > 2 && !singleChoiceLocked;
                    return (
                        <div key={item.id} className="flex items-center gap-3">
                            <div className="flex-1">
                                <Input
                                    id={`ranking-${item.id}-label`}
                                    label=""
                                    value={item.label}
                                    onChange={(e) => handleLabelChange(item.id, e.target.value)}
                                    placeholder="Write an option..."
                                />
                            </div>
                            <select
                                value={item.qualification || 'qualify'}
                                onChange={(e) => handleQualificationChange(item.id, e.target.value as 'qualify' | 'disqualify')}
                                className="pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.375rem_center] bg-no-repeat"
                            >
                                <option value="qualify">Qualify</option>
                                <option value="disqualify">Disqualify</option>
                            </select>
                            <button
                                onClick={() => handleDelete(item.id)}
                                disabled={!canDelete}
                                className={`p-2 rounded transition-colors ${canDelete ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
                                title={canDelete ? 'Delete item' : 'Minimum 2 items required'}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    );
                })}
                {!singleChoiceLocked && (
                <Button
                    onClick={handleAdd}
                    variant="outline"
                    className="w-full"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add another choice
                </Button>
                )}
                {!singleChoiceLocked && (
                <div className="mt-2 flex items-center">
                    <Toggle
                        id={`ranking-randomize-${component.id}`}
                        label="Randomize the order of questions"
                        checked={randomize}
                        onChange={(e) => handleRandomizeChange(e.target.checked)}
                    />
                </div>
                )}
            </div>
        </div>
    );
};
