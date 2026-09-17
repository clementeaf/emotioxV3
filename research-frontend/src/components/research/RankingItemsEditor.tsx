import { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { Trash2, Plus, ImagePlus, X } from 'lucide-react';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import { CustomSelect } from '../ui/CustomSelect';
import { mediaService } from '../../services/media.service';

const QUALIFICATION_OPTIONS = [
    { value: 'qualify', label: 'Qualify' },
    { value: 'disqualify', label: 'Disqualify' },
];

const MIN_ITEMS = 2;

export interface RankingItemsEditorProps {
    component: ComponentConfig;
    value: string;
    onChange: (value: string) => void;
    researchId?: string;
    /** @deprecated No-op, kept for call-site compat. */
    singleChoiceLocked?: boolean;
    /** @deprecated No-op, kept for call-site compat. */
    screenerMultipleChoiceMinOptions?: number;
}

type RankingItem = {
    id: string;
    label: string;
    qualification?: 'qualify' | 'disqualify';
    image?: { s3Key: string; url?: string };
};

export const RankingItemsEditor = ({
    component,
    value,
    onChange,
    researchId,
}: RankingItemsEditorProps) => {
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const buildInitialState = (): { items: RankingItem[]; randomize: boolean } => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (parsed && !Array.isArray(parsed) && parsed.items) {
                    return { items: parsed.items as RankingItem[], randomize: !!parsed.randomize };
                }
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return { items: parsed as RankingItem[], randomize: false };
                }
            } catch { /* not JSON */ }
        }
        const items = component.rankingConfig?.items;
        if (items && items.length > 0) return { items, randomize: false };
        const blankItems: RankingItem[] = [];
        for (let i = 0; i < 3; i++) {
            blankItems.push({ id: `item-${crypto.randomUUID()}`, label: '', qualification: 'qualify' });
        }
        return { items: blankItems, randomize: false };
    };

    const [localItems, setLocalItems] = useState<RankingItem[]>(() => buildInitialState().items);
    const [randomize, setRandomize] = useState<boolean>(() => buildInitialState().randomize);

    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (parsed && !Array.isArray(parsed) && parsed.items) {
                    setLocalItems(parsed.items as RankingItem[]);
                    setRandomize(!!parsed.randomize);
                } else if (Array.isArray(parsed)) {
                    setLocalItems(parsed as RankingItem[]);
                    setRandomize(false);
                }
            } catch { /* keep current */ }
        }
    }, [value]);

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
        const newItem: RankingItem = { id: `item-${crypto.randomUUID()}`, label: '', qualification: 'qualify' };
        const updated = [...localItems, newItem];
        setLocalItems(updated);
        persist(updated, randomize);
    };

    const handleDelete = (itemId: string) => {
        const updated = localItems.filter(item => item.id !== itemId);
        setLocalItems(updated);
        persist(updated, randomize);
    };

    const handleImageUpload = async (itemId: string, file: File) => {
        if (!researchId) return;
        try {
            const { s3Key } = await mediaService.uploadFile(researchId, file);
            const { url } = await mediaService.getMediaUrl(s3Key);
            const updated = localItems.map(item =>
                item.id === itemId ? { ...item, image: { s3Key, url } } : item
            );
            setLocalItems(updated);
            persist(updated, randomize);
        } catch (err) {
            console.error('Image upload failed:', err);
        }
    };

    const handleImageRemove = (itemId: string) => {
        const updated = localItems.map(item =>
            item.id === itemId ? { ...item, image: undefined } : item
        );
        setLocalItems(updated);
        persist(updated, randomize);
    };

    const handleRandomizeChange = (checked: boolean) => {
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
                    const canDelete = localItems.length > MIN_ITEMS;
                    return (
                        <div key={item.id} className="flex items-center gap-3">
                            {item.image?.url ? (
                                <div className="relative w-10 h-10 flex-shrink-0">
                                    <img src={item.image.url} alt="" className="w-10 h-10 rounded object-cover" />
                                    <button
                                        onClick={() => handleImageRemove(item.id)}
                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                                    >
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRefs.current[item.id]?.click()}
                                    className="w-10 h-10 flex-shrink-0 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                                    title="Add image"
                                >
                                    <ImagePlus className="h-4 w-4" />
                                    <input
                                        ref={el => { fileInputRefs.current[item.id] = el; }}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleImageUpload(item.id, f);
                                            e.target.value = '';
                                        }}
                                    />
                                </button>
                            )}
                            <div className="flex-1">
                                <Input
                                    id={`ranking-${item.id}-label`}
                                    label=""
                                    value={item.label}
                                    onChange={(e) => handleLabelChange(item.id, e.target.value)}
                                    placeholder="Write an option..."
                                />
                            </div>
                            <div className="w-36">
                                <CustomSelect
                                    options={QUALIFICATION_OPTIONS}
                                    value={item.qualification || 'qualify'}
                                    onChange={(v) => handleQualificationChange(item.id, v as 'qualify' | 'disqualify')}
                                />
                            </div>
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
                <Button
                    onClick={handleAdd}
                    variant="outline"
                    className="w-full"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add another choice
                </Button>
                <div className="mt-2 flex items-center">
                    <Toggle
                        id={`ranking-randomize-${component.id}`}
                        label="Randomize the order of questions"
                        checked={randomize}
                        onChange={(e) => handleRandomizeChange(e.target.checked)}
                    />
                </div>
            </div>
        </div>
    );
};
