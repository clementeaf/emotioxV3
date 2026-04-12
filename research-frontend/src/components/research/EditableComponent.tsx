import { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { CustomSelect } from '../ui/CustomSelect';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { FileUploadAdvanced, type UploadedFile } from '../ui/FileUploadAdvanced';
import { LocalHitzoneEditor, type HitzoneArea } from '../ui/LocalHitzoneEditor';
import { MultiLangInput } from './MultiLangInput';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

interface RadioChoicesEditorProps {
    component: ComponentConfig;
    value: string;
    onChange: (value: string) => void;
    /** Screener: Single Choice — one option row, no add/delete/randomize */
    singleChoiceLocked?: boolean;
    /** Screener: Multiple Choice — default minimum option rows (e.g. 3) */
    screenerMultipleChoiceMinOptions?: number;
}

type ChoiceItem = {
    id: string;
    label: string;
    value?: string;
    eligibility?: 'Qualify' | 'Disqualify';
};

/**
 * Editor especial para componentes radio con choices array
 */
const RadioChoicesEditor = ({
    component,
    value,
    onChange,
    singleChoiceLocked = false,
    screenerMultipleChoiceMinOptions,
}: RadioChoicesEditorProps) => {
    // Build sensible initial choices: from saved value, settings.choices, or seed defaults
    const buildInitialChoices = (): ChoiceItem[] => {
        // 1. Try parsing saved value
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed as ChoiceItem[];
            } catch { /* not JSON */ }
        }
        // 2. Try settings.choices (legacy)
        if (Array.isArray(component.settings?.choices) && component.settings.choices.length > 0) {
            return component.settings.choices as ChoiceItem[];
        }
        // 3. Seed with minOptions empty choices so the editor is not blank
        const baseMin = (component.settings?.minOptions as number) || 2;
        const min = singleChoiceLocked
            ? 1
            : (screenerMultipleChoiceMinOptions ?? baseMin);
        const defaults: ChoiceItem[] = [];
        for (let i = 0; i < min; i++) {
            defaults.push({ id: `choice-${i + 1}`, label: '', value: `option-${i + 1}`, eligibility: 'Qualify' });
        }
        return defaults;
    };

    const [localChoices, setLocalChoices] = useState<ChoiceItem[]>(buildInitialChoices);
    const prevMultipleModeRef = useRef<boolean>(false);

    // Sync with external value changes (trim to one row when Screener Single Choice)
    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    let arr = parsed as ChoiceItem[];
                    if (singleChoiceLocked && arr.length > 1) {
                        arr = [arr[0]];
                        onChange(JSON.stringify(arr));
                    }
                    setLocalChoices(arr);
                }
            } catch {
                // Invalid JSON, keep current state
            }
        }
    }, [value, singleChoiceLocked, onChange]);

    useEffect(() => {
        if (!singleChoiceLocked) {
            return;
        }
        setLocalChoices((prev) => {
            if (prev.length <= 1) {
                return prev;
            }
            const trimmed = [prev[0]];
            onChange(JSON.stringify(trimmed));
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
        setLocalChoices((prev) => {
            if (prev.length >= 3) {
                return prev;
            }
            const need = 3 - prev.length;
            const next = [...prev];
            for (let i = 0; i < need; i++) {
                next.push({
                    id: `choice-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`,
                    label: '',
                    value: `option-${next.length + 1}`,
                    eligibility: 'Qualify',
                });
            }
            onChange(JSON.stringify(next));
            return next;
        });
    }, [singleChoiceLocked, screenerMultipleChoiceMinOptions, onChange]);

    const handleChoiceChange = (choiceId: string, field: 'label' | 'eligibility', newValue: string) => {
        const updated = localChoices.map((choice) =>
            choice.id === choiceId ? { ...choice, [field]: newValue } : choice
        );
        setLocalChoices(updated);
        onChange(JSON.stringify(updated));
    };

    const handleAddChoice = () => {
        if (singleChoiceLocked) {
            return;
        }
        const newChoice: ChoiceItem = {
            id: `choice-${Date.now()}`,
            label: `Option ${localChoices.length + 1}`,
            value: `option-${localChoices.length + 1}`,
            eligibility: 'Qualify'
        };
        const updated = [...localChoices, newChoice];
        setLocalChoices(updated);
        onChange(JSON.stringify(updated));
    };

    const handleDeleteChoice = (choiceId: string) => {
        if (singleChoiceLocked) {
            return;
        }
        const updated = localChoices.filter((choice) => choice.id !== choiceId);
        setLocalChoices(updated);
        onChange(JSON.stringify(updated));
    };

    const choiceGridClass =
        'grid grid-cols-[minmax(0,1fr)_minmax(10rem,11rem)_2.5rem] items-center gap-x-3 gap-y-0';

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
                {component.label}
            </label>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className={choiceGridClass + ' border-b border-gray-200 bg-gray-50/80 px-3 py-2'}>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Option</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Eligibility</span>
                    <span className="sr-only">Actions</span>
                </div>
                <div className="divide-y divide-gray-100">
                    {localChoices.map((choice) => {
                    const canDelete = localChoices.length > 2 && !singleChoiceLocked;
                    return (
                    <div
                        key={choice.id}
                        className={choiceGridClass + ' min-h-[3rem] px-3 py-2'}
                    >
                        <div className="min-w-0 self-center">
                            <Input
                                id={`choice-${choice.id}-label`}
                                label=""
                                value={choice.label}
                                onChange={(e) => handleChoiceChange(choice.id, 'label', e.target.value)}
                                placeholder="Enter option text..."
                            />
                        </div>
                        <div className="min-w-0 self-center">
                            <CustomSelect
                                id={`choice-${choice.id}-eligibility`}
                                label=""
                                value={choice.eligibility ?? 'Qualify'}
                                onChange={(val) => handleChoiceChange(choice.id, 'eligibility', val)}
                                options={[
                                    { value: 'Qualify', label: 'Qualify' },
                                    { value: 'Disqualify', label: 'Disqualify' }
                                ]}
                            />
                        </div>
                        <div className="flex justify-end self-center">
                        <button
                            type="button"
                            onClick={() => handleDeleteChoice(choice.id)}
                            disabled={!canDelete}
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded p-2 transition-colors ${canDelete ? 'text-red-600 hover:bg-red-50' : 'cursor-not-allowed text-gray-400 opacity-50'}`}
                            title={canDelete ? 'Delete option' : 'Minimum 2 options required'}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        </div>
                    </div>
                    );
                })}
                </div>
                {!singleChoiceLocked && (
                <div className="border-t border-gray-100 bg-gray-50/40 p-2">
                    <Button
                        onClick={handleAddChoice}
                        variant="outline"
                        className="w-full"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add another choice
                    </Button>
                </div>
                )}
            </div>
        </div>
    );
};

interface RankingItemsEditorProps {
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
const RankingItemsEditor = ({
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

// ─── IAT Criteria Editor ────────────────────────────────────────────────────

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
}

/**
 * Editor para los criterios (attributes) de un test IAT.
 * Muestra una tabla: Orden | Nombre del atributo | Target (selector) | Eliminar.
 * El investigador asigna cada criteria a un target para determinar la respuesta correcta.
 */
const IATCriteriaEditor = ({ component, value, onChange, targets }: IATCriteriaEditorProps) => {
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
                <div className="grid grid-cols-[2rem_3rem_1fr_auto_2.5rem_2.5rem] items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <span />
                    <span>Order</span>
                    <span>Attribute name</span>
                    <span>Target</span>
                    <span />
                    <span />
                </div>

                {/* Rows */}
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className={`grid grid-cols-[2rem_3rem_1fr_auto_2.5rem_2.5rem] items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 ${item.hidden ? 'opacity-50 bg-gray-50' : ''}`}
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

                        {/* Target selector */}
                        <div className="min-w-[140px]">
                            <CustomSelect
                                value={item.targetId || ''}
                                onChange={(val) => handleTargetChange(item.id, val)}
                                options={targets.map((t) => ({ value: t.id, label: t.name }))}
                                placeholder="— Select —"
                            />
                        </div>

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
        </div>
    );
};

// ─── File Upload Editor ──────────────────────────────────────────────────────

interface FileUploadEditorProps {
    component: ComponentConfig;
    value: string;
    onChange: (value: string) => void;
    researchId?: string;
}

const FileUploadEditorComponent = ({ component, value, onChange, researchId }: FileUploadEditorProps) => {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [hitzoneModalOpen, setHitzoneModalOpen] = useState(false);
    const [hitzoneFile, setHitzoneFile] = useState<UploadedFile | null>(null);

    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    setFiles(parsed);
                }
            } catch {
                setFiles([]);
            }
        } else {
            setFiles([]);
        }
    }, [value]);

    const handleFilesChange = (newFiles: UploadedFile[]): void => {
        setFiles(newFiles);
        onChange(JSON.stringify(newFiles));
    };

    const handleFileDelete = (fileId: string): void => {
        const updated = files.filter((f) => f.id !== fileId);
        setFiles(updated);
        onChange(JSON.stringify(updated));
    };

    const handleHitzoneEdit = (file: UploadedFile): void => {
        setHitzoneFile(file);
        setHitzoneModalOpen(true);
    };

    const handleHitzoneSave = (areas: HitzoneArea[]): void => {
        if (!hitzoneFile) return;

        const updatedFiles = files.map((f) => {
            if (f.id === hitzoneFile.id) {
                const hitZones = areas.map((area) => ({
                    id: area.id,
                    name: '',
                    fileId: f.id,
                    region: {
                        x: area.x,
                        y: area.y,
                        width: area.width,
                        height: area.height,
                    },
                }));

                return {
                    ...f,
                    hitZones,
                };
            }
            return f;
        });

        setFiles(updatedFiles);
        onChange(JSON.stringify(updatedFiles));
        setHitzoneModalOpen(false);
        setHitzoneFile(null);
    };

    const showHitzoneEditor = component.fileUpload?.allowHitZones ?? false;

    return (
        <>
            <FileUploadAdvanced
                label={component.label}
                description={component.settings?.description}
                acceptedFormats={component.fileUpload?.acceptedFormats || ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']}
                maxSizeMB={component.fileUpload?.maxSizeMB || 5}
                multiple={component.fileUpload?.multiple ?? true}
                files={files}
                onFilesChange={handleFilesChange}
                onFileDelete={handleFileDelete}
                onHitzoneEdit={showHitzoneEditor ? handleHitzoneEdit : undefined}
                showHitzoneEditor={showHitzoneEditor}
                researchId={researchId}
                listOnly={component.settings?.listOnly === true}
            />
            {hitzoneModalOpen && hitzoneFile && typeof window !== 'undefined' && ReactDOM.createPortal(
                <div className="fixed inset-0 w-screen h-screen top-0 left-0 flex items-center justify-center bg-black bg-opacity-40 m-0 p-0" style={{ zIndex: 10000 }}>
                    <div className="bg-white rounded-lg shadow-lg py-6 px-8 w-auto relative flex flex-col items-center max-w-[90vw] max-h-[90vh] overflow-auto">
                        <h2 className="text-lg font-semibold mb-4 text-center">
                            Edit hitzones for: {hitzoneFile.name}
                        </h2>
                        <LocalHitzoneEditor
                            imageUrl={hitzoneFile.url || ''}
                            s3Key={hitzoneFile.s3Key}
                            initialAreas={(hitzoneFile.hitZones || []).map((hz) => ({
                                id: hz.id,
                                x: hz.region.x,
                                y: hz.region.y,
                                width: hz.region.width,
                                height: hz.region.height,
                            }))}
                            onSave={handleHitzoneSave}
                            onClose={() => {
                                setHitzoneModalOpen(false);
                                setHitzoneFile(null);
                            }}
                        />
                    </div>
                </div>,
                document.body as Element
            )}
        </>
    );
};

/** IAT target option for criteria target selector */
export interface IATTargetOption {
    id: string;
    name: string;
}

interface EditableComponentProps {
    component: ComponentConfig;
    value: string;
    onChange: (value: string) => void;
    researchId?: string; // For S3 upload in file-upload components
    /** Inline: label + control on one row (Screener header row). */
    fieldLayout?: 'default' | 'inline';
    /** Screener: Choice Type = Single Choice — lock options UI (see RadioChoicesEditor). */
    screenerSingleChoiceLocked?: boolean;
    /** Screener: Multiple Choice — default minimum option rows (e.g. 3). */
    screenerMultipleChoiceMinOptions?: number;
    /** IAT: available targets for criteria assignment */
    iatTargets?: IATTargetOption[];
}

/**
 * Componente que renderiza un componente editable según su tipo
 */
export const EditableComponent = ({
    component,
    value,
    onChange,
    researchId,
    fieldLayout = 'default',
    screenerSingleChoiceLocked = false,
    screenerMultipleChoiceMinOptions,
    iatTargets,
}: EditableComponentProps) => {
    const placeholder = component.placeholder?.enabled
        ? component.placeholder.text || ''
        : undefined;

    const labelPosition = fieldLayout === 'inline' ? 'inline' : 'above';

    switch (component.type) {
        case 'input': {
            // Special handling for NPS scale range - should always be readonly
            if (component.id?.includes('nps-scale-range')) {
                // Force readonly input with fixed "0-10" value for NPS scale range
                return (
                    <Input
                        id={`module-${component.id}`}
                        label={component.label}
                        value="0-10"
                        onChange={() => {}} // No-op since it's readonly
                        placeholder=""
                        disabled={true}
                        readOnly={true}
                    />
                );
            }
            
            // Check if this should be a readonly input based on component ID or existing settings
            // Special handling for other scale ranges to ensure they're readonly when appropriate
            const isScaleRange = component.id?.includes('scale-range');
            const isReadonly = (component.settings?.readonly === true) || 
                              (isScaleRange && component.settings?.defaultValue);
            const defaultValue = isReadonly && component.settings?.defaultValue
                ? String(component.settings.defaultValue)
                : '';
            return (
                <div className={fieldLayout === 'inline' ? 'min-w-0 flex-1' : 'max-w-2xl'}>
                    <Input
                        id={`module-${component.id}`}
                        label={component.label}
                        labelPosition={labelPosition}
                        value={value || defaultValue}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        disabled={!!isReadonly}
                        readOnly={!!isReadonly}
                    />
                </div>
            );
        }

        case 'select':
            // Special handling for NPS scale range - should never be a select
            if (component.id?.includes('nps-scale-range')) {
                // Force readonly input with fixed "0-10" value for NPS scale range
                return (
                    <Input
                        id={`module-${component.id}`}
                        label={component.label}
                        value="0-10"
                        onChange={() => {}} // No-op since it's readonly
                        placeholder=""
                        disabled={true}
                        readOnly={true}
                    />
                );
            }
            
            return (
                <div className={fieldLayout === 'inline' ? 'min-w-0 flex-1 sm:max-w-xs' : 'max-w-md'}>
                    <CustomSelect
                        id={`module-${component.id}`}
                        label={component.label}
                        labelPosition={labelPosition}
                        value={value}
                        onChange={onChange}
                        options={component.options || []}
                        placeholder="Select an option"
                    />
                </div>
            );

        case 'textarea': {
            const isIatInstructions = component.id === 'exercise-instructions' || component.id === 'test-instructions';
            if (isIatInstructions) {
                return (
                    <div className="max-w-2xl">
                        <MultiLangInput
                            label={component.label}
                            value={value}
                            onChange={onChange}
                            placeholder={placeholder}
                            multiline
                            maxLength={component.settings?.maxLength as number | undefined}
                        />
                    </div>
                );
            }
            return (
                <div className="max-w-2xl">
                    <Textarea
                        id={`module-${component.id}`}
                        label={component.label}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        rows={4}
                    />
                </div>
            );
        }

        case 'checkbox': {
            const isRandomizeField =
                (component.label ?? '').toLowerCase().includes('randomize') ||
                (component.id ?? '').toLowerCase().includes('randomize');
            if (screenerSingleChoiceLocked && fieldLayout !== 'inline' && isRandomizeField) {
                return null;
            }
            return (
                <div
                    className={
                        fieldLayout === 'inline'
                            ? 'flex shrink-0 items-center'
                            : 'flex items-center'
                    }
                >
                    <Toggle
                        id={`module-${component.id}`}
                        label={component.label}
                        checked={value === 'true'}
                        onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
                    />
                </div>
            );
        }

        case 'radio':
            return (
                <RadioChoicesEditor
                    component={component}
                    value={value}
                    onChange={onChange}
                    singleChoiceLocked={screenerSingleChoiceLocked}
                    screenerMultipleChoiceMinOptions={screenerMultipleChoiceMinOptions}
                />
            );

        case 'ranking':
        case 'ranking-list':
            // IAT criteria: component.settings.hasImage === true → use dedicated editor
            if (component.settings?.hasImage) {
                return (
                    <IATCriteriaEditor
                        component={component}
                        value={value}
                        onChange={onChange}
                        researchId={researchId}
                        targets={iatTargets || []}
                    />
                );
            }
            return (
                <RankingItemsEditor
                    component={component}
                    value={value}
                    onChange={onChange}
                    singleChoiceLocked={screenerSingleChoiceLocked}
                    screenerMultipleChoiceMinOptions={screenerMultipleChoiceMinOptions}
                />
            );

        case 'checkbox-list':
        case 'option-list':
            return (
                <RadioChoicesEditor
                    component={component}
                    value={value}
                    onChange={onChange}
                    singleChoiceLocked={screenerSingleChoiceLocked}
                    screenerMultipleChoiceMinOptions={screenerMultipleChoiceMinOptions}
                />
            );

        case 'file-upload':
            return (
                <FileUploadEditorComponent
                    component={component}
                    value={value}
                    onChange={onChange}
                    researchId={researchId}
                />
            );

        default:
            // Silently skip unsupported component types (e.g. image-upload)
            return null;
    }
};

