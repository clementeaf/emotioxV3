import { useState, useEffect, useCallback } from 'react';
import { CustomSelect } from '../ui/CustomSelect';
import { Button } from '../ui/Button';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import type { IATTargetOption } from './EditableComponent';

type IATCriterionItem = {
    id: string;
    label: string;
    /** Target ID assigned by researcher (e.g. "Target 1") — determines correct answer */
    targetId?: string;
    /** When true, this criterion is hidden from participants but preserved in config */
    hidden?: boolean;
    /** @deprecated Legacy image field — replaced by targetId selector */
    image?: unknown;
};

interface IATCriteriaEditorProps {
    component: ComponentConfig;
    value: string;
    onChange: (value: string) => void;
    researchId?: string;
    /** Available targets/objects from the module for the target selector */
    targets: IATTargetOption[];
    /** When true, hides target selector — criteria iterate through all targets (no pre-assignment) */
    hideTargetSelector?: boolean;
}

/**
 * Editor para los criterios (attributes) de un test IAT.
 * Muestra una tabla: Orden | Nombre del atributo | Target (selector) | Eliminar.
 * El investigador asigna cada criteria a un target para determinar la respuesta correcta.
 */
export const IATCriteriaEditor = ({ component, value, onChange, targets, hideTargetSelector }: IATCriteriaEditorProps) => {
    const minItems = (component.settings?.minItems as number) ?? 1;
    const maxItems = (component.settings?.maxItems as number) ?? 15;

    const buildInitialItems = (): IATCriterionItem[] => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed as IATCriterionItem[];
                }
            } catch { /* not JSON */ }
        }
        const count = Math.max(minItems, 4);
        return Array.from({ length: count }, () => ({
            id: `criterion-${crypto.randomUUID()}`,
            label: '',
            targetId: undefined,
        }));
    };

    const [items, setItems] = useState<IATCriterionItem[]>(buildInitialItems);

    // Sync items from external value changes
    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setItems(parsed as IATCriterionItem[]);
                }
            } catch { /* keep current */ }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const persist = useCallback((next: IATCriterionItem[]) => {
        const toSave = next.map(({ id, label, targetId, hidden }) => ({
            id, label, targetId,
            ...(hidden ? { hidden } : {}),
        }));
        onChange(JSON.stringify(toSave));
    }, [onChange]);

    const handleLabelChange = (id: string, label: string) => {
        const next = items.map((it) => it.id === id ? { ...it, label } : it);
        setItems(next);
        persist(next);
    };

    const handleTargetChange = (id: string, targetId: string) => {
        const next = items.map((it) => it.id === id ? { ...it, targetId: targetId || undefined } : it);
        setItems(next);
        persist(next);
    };

    const handleToggleHidden = (id: string) => {
        const next = items.map((it) => it.id === id ? { ...it, hidden: !it.hidden } : it);
        setItems(next);
        persist(next);
    };

    const handleAdd = () => {
        if (items.length >= maxItems) return;
        const next = [...items, { id: `criterion-${crypto.randomUUID()}`, label: '', targetId: undefined }];
        setItems(next);
        persist(next);
    };

    const handleDelete = (id: string) => {
        if (items.length <= minItems) return;
        const next = items.filter((it) => it.id !== id);
        setItems(next);
        persist(next);
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">{component.label}</label>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Header */}
                <div className={`grid ${hideTargetSelector ? 'grid-cols-[2rem_3rem_1fr_2.5rem_2.5rem]' : 'grid-cols-[2rem_3rem_1fr_auto_2.5rem_2.5rem]'} items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide`}>
                    <span />
                    <span>Order</span>
                    <span>Attribute name</span>
                    {!hideTargetSelector && <span>Target</span>}
                    <span />
                    <span />
                </div>

                {/* Rows */}
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className={`grid ${hideTargetSelector ? 'grid-cols-[2rem_3rem_1fr_2.5rem_2.5rem]' : 'grid-cols-[2rem_3rem_1fr_auto_2.5rem_2.5rem]'} items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 ${item.hidden ? 'opacity-50 bg-gray-50' : ''}`}
                    >
                        {/* Drag handle (visual only) */}
                        <span className="text-gray-300 cursor-grab select-none text-lg leading-none">⠿</span>

                        {/* Order */}
                        <span className="text-sm text-gray-500 font-mono">{String(index + 1).padStart(2, '0')}</span>

                        {/* Attribute name input */}
                        <input
                            type="text"
                            value={item.label}
                            onChange={(e) => handleLabelChange(item.id, e.target.value)}
                            placeholder="Attribute"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />

                        {/* Target selector — hidden when criteria iterate all targets */}
                        {!hideTargetSelector && (
                            <div className="min-w-[140px]">
                                <CustomSelect
                                    value={item.targetId || ''}
                                    onChange={(val) => handleTargetChange(item.id, val)}
                                    options={targets.map((t) => ({ value: t.id, label: t.name }))}
                                    placeholder="— Select —"
                                />
                            </div>
                        )}

                        {/* Hide/Show toggle */}
                        <button
                            type="button"
                            onClick={() => handleToggleHidden(item.id)}
                            className="flex items-center justify-center h-8 w-8 rounded transition-colors text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            title={item.hidden ? 'Show to participants' : 'Hide from participants'}
                        >
                            {item.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>

                        {/* Delete action */}
                        <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={items.length <= minItems}
                            className="flex items-center justify-center h-8 w-8 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>

            {items.length < maxItems && (
                <Button variant="outline" onClick={handleAdd} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add attribute
                </Button>
            )}

            {!hideTargetSelector && targets.length >= 2 && items.some(item => item.label.trim() && !item.targetId && !item.hidden) && (
                <p className="text-xs text-amber-600 mt-2">
                    Some criteria have no target assigned. Assign targets for accurate scoring.
                </p>
            )}
        </div>
    );
};
