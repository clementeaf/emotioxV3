import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { CustomSelect } from '../ui/CustomSelect';
import { Button } from '../ui/Button';
import { Trash2, Plus } from 'lucide-react';
import { FileUploadAdvanced, type UploadedFile } from '../ui/FileUploadAdvanced';
import { LocalHitzoneEditor, type HitzoneArea } from '../ui/LocalHitzoneEditor';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

interface RadioChoicesEditorProps {
    component: ComponentConfig;
    value: string;
    onChange: (value: string) => void;
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
const RadioChoicesEditor = ({ component, value, onChange }: RadioChoicesEditorProps) => {
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
        const min = (component.settings?.minOptions as number) || 2;
        const defaults: ChoiceItem[] = [];
        for (let i = 0; i < min; i++) {
            defaults.push({ id: `choice-${i + 1}`, label: '', value: `option-${i + 1}`, eligibility: 'Qualify' });
        }
        return defaults;
    };

    const [localChoices, setLocalChoices] = useState<ChoiceItem[]>(buildInitialChoices);

    // Sync with external value changes
    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    setLocalChoices(parsed as ChoiceItem[]);
                }
            } catch {
                // Invalid JSON, keep current state
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChoiceChange = (choiceId: string, field: 'label' | 'eligibility', newValue: string) => {
        const updated = localChoices.map((choice) =>
            choice.id === choiceId ? { ...choice, [field]: newValue } : choice
        );
        setLocalChoices(updated);
        onChange(JSON.stringify(updated));
    };

    const handleAddChoice = () => {
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
        const updated = localChoices.filter((choice) => choice.id !== choiceId);
        setLocalChoices(updated);
        onChange(JSON.stringify(updated));
    };

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
                {component.label}
            </label>
            <div className="space-y-3">
                {localChoices.map((choice) => {
                    const canDelete = localChoices.length > 2;
                    return (
                    <div key={choice.id} className="flex items-start gap-3">
                        <div className="flex-1">
                            <Input
                                id={`choice-${choice.id}-label`}
                                label=""
                                value={choice.label}
                                onChange={(e) => handleChoiceChange(choice.id, 'label', e.target.value)}
                                placeholder="Enter option text..."
                            />
                        </div>
                        <div className="w-40">
                            <CustomSelect
                                id={`choice-${choice.id}-eligibility`}
                                label="Elegibility"
                                value={choice.eligibility ?? 'Qualify'}
                                onChange={(val) => handleChoiceChange(choice.id, 'eligibility', val)}
                                options={[
                                    { value: 'Qualify', label: 'Qualify' },
                                    { value: 'Disqualify', label: 'Disqualify' }
                                ]}
                            />
                        </div>
                        <button
                            onClick={() => handleDeleteChoice(choice.id)}
                            disabled={!canDelete}
                            className={`mt-6 p-2 rounded transition-colors ${canDelete ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
                            title={canDelete ? 'Delete option' : 'Minimum 2 options required'}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                    );
                })}
                <Button
                    onClick={handleAddChoice}
                    variant="outline"
                    className="w-full"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add another choice
                </Button>
            </div>
        </div>
    );
};

interface EditableComponentProps {
    component: ComponentConfig;
    value: string;
    onChange: (value: string) => void;
    researchId?: string; // For S3 upload in file-upload components
}

/**
 * Componente que renderiza un componente editable según su tipo
 */
export const EditableComponent = ({ component, value, onChange, researchId }: EditableComponentProps) => {
    const placeholder = component.placeholder?.enabled
        ? component.placeholder.text || ''
        : undefined;

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
                <div className="max-w-2xl">
                    <Input
                        id={`module-${component.id}`}
                        label={component.label}
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
            
            // Special handling for other scale ranges - should never be a select
            if (component.id?.includes('scale-range')) {
                // Treat as readonly input instead
                const defaultValue = component.settings?.defaultValue
                    ? String(component.settings.defaultValue)
                    : (component.options && component.options.length > 0 
                       ? component.options[0].value 
                       : '');
                return (
                    <Input
                        id={`module-${component.id}`}
                        label={component.label}
                        value={value || defaultValue}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder=""
                        disabled={true}
                        readOnly={true}
                    />
                );
            }
            return (
                <div className="max-w-md">
                    <CustomSelect
                        id={`module-${component.id}`}
                        label={component.label}
                        value={value}
                        onChange={onChange}
                        options={component.options || []}
                        placeholder="Select an option"
                    />
                </div>
            );

        case 'textarea':
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

        case 'checkbox':
            return (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {component.label}
                    </label>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id={`module-${component.id}`}
                            checked={value === 'true'}
                            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                    </div>
                </div>
            );

        case 'radio':
            return (
                <RadioChoicesEditor
                    component={component}
                    value={value}
                    onChange={onChange}
                />
            );

        case 'ranking': {
            const items = component.rankingConfig?.items || [];
            return (
                <div className="space-y-2">
                    {items.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border">
                            <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                            <span className="text-sm">{item.label}</span>
                        </div>
                    ))}
                </div>
            );
        }

        case 'checkbox-list':
        case 'option-list':
            return (
                <RadioChoicesEditor
                    component={component}
                    value={value}
                    onChange={onChange}
                />
            );

        case 'file-upload': {
            const FileUploadEditor = () => {
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

                // Check if hitzone editor should be enabled based on fileUpload config
                const showHitzoneEditor = component.fileUpload?.allowHitZones ?? false;

                return (
                    <>
                        <FileUploadAdvanced
                            label={component.label}
                            description={component.settings?.description}
                            acceptedFormats={component.fileUpload?.acceptedFormats || ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']}
                            maxSizeMB={component.fileUpload?.maxSizeMB || 5}
                            multiple={true}
                            files={files}
                            onFilesChange={handleFilesChange}
                            onFileDelete={handleFileDelete}
                            onHitzoneEdit={showHitzoneEditor ? handleHitzoneEdit : undefined}
                            showHitzoneEditor={showHitzoneEditor}
                            researchId={researchId}
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

            return <FileUploadEditor />;
        }

        default:
            return (
                <div className="text-sm text-gray-500">
                    Component type "{component.type}" is not supported for editing
                </div>
            );
    }
};

