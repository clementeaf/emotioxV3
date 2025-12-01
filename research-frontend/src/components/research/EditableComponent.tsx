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
    const initialChoices: ChoiceItem[] = component.settings?.choices ?? [];
    const [localChoices, setLocalChoices] = useState<ChoiceItem[]>(initialChoices);

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
        } else if (initialChoices.length > 0) {
            setLocalChoices(initialChoices);
        }
    }, [value, initialChoices]);

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
                {localChoices.map((choice) => (
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
                            className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete option"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
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
}

/**
 * Componente que renderiza un componente editable según su tipo
 */
export const EditableComponent = ({ component, value, onChange }: EditableComponentProps) => {
    const placeholder = component.placeholder?.enabled
        ? component.placeholder.text || ''
        : undefined;

    switch (component.type) {
        case 'input':
            return (
                <Input
                    id={`module-${component.id}`}
                    label={component.label}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            );

        case 'textarea':
            return (
                <Textarea
                    id={`module-${component.id}`}
                    label={component.label}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={4}
                />
            );

        case 'select':
            return (
                <CustomSelect
                    id={`module-${component.id}`}
                    label={component.label}
                    value={value}
                    onChange={onChange}
                    options={component.options || []}
                    placeholder="Select an option"
                />
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

                const isNavigationFlow = component.settings?.name === 'Image Upload' || component.id === 'image-upload';

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
                            onHitzoneEdit={isNavigationFlow ? handleHitzoneEdit : undefined}
                            showHitzoneEditor={isNavigationFlow}
                        />
                        {hitzoneModalOpen && hitzoneFile && typeof window !== 'undefined' && ReactDOM.createPortal(
                            <div className="fixed inset-0 w-screen h-screen top-0 left-0 flex items-center justify-center bg-black bg-opacity-40 m-0 p-0" style={{ zIndex: 10000 }}>
                                <div className="bg-white rounded-lg shadow-lg py-6 px-8 w-auto relative flex flex-col items-center max-w-[90vw] max-h-[90vh] overflow-auto">
                                    <h2 className="text-lg font-semibold mb-4 text-center">
                                        Edit hitzones for: {hitzoneFile.name}
                                    </h2>
                                    <LocalHitzoneEditor
                                        imageUrl={hitzoneFile.url || ''}
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

