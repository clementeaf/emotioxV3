import { useState, memo } from 'react';
import ReactDOM from 'react-dom';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { CustomSelect } from '../ui/CustomSelect';
import { ScaleRating } from '../ui/ScaleRating';
import { Checkbox } from '../ui/Checkbox';
import { FileUploadAdvanced, type UploadedFile } from '../ui/FileUploadAdvanced';
import { LocalHitzoneEditor, type HitzoneArea } from '../ui/LocalHitzoneEditor';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

interface PreviewComponentProps {
    component: ComponentConfig;
}

export const PreviewComponent = memo(({ component }: PreviewComponentProps) => {
    const [selectValue, setSelectValue] = useState<string>('');

    // Generate range options for select components
    const generateRangeOptions = () => {
        if (!component.selectRange) return [];

        if (component.selectRange.type === 'predefined') {
            const range = component.selectRange.predefined || '1-5';
            const [min, max] = range.split('-').map(Number);
            return Array.from({ length: max - min + 1 }, (_, i) => ({
                value: String(min + i),
                label: String(min + i),
            }));
        } else if (component.selectRange.type === 'custom' && component.selectRange.custom) {
            const { min, max } = component.selectRange.custom;
            return Array.from({ length: max - min + 1 }, (_, i) => ({
                value: String(min + i),
                label: String(min + i),
            }));
        }

        return [];
    };

    // Render component based on type
    switch (component.type) {
        case 'input':
            // If it's a choice input (grouped), don't show individual label
            const isChoice = (component.settings as any)?.isChoice;
            return (
                <Input
                    id={`preview-${component.id}`}
                    label={isChoice ? '' : component.label}
                    placeholder={
                        component.placeholder?.enabled
                            ? component.placeholder.text || 'Enter your response...'
                            : undefined
                    }
                />
            );

        case 'textarea':
            return (
                <Textarea
                    id={`preview-${component.id}`}
                    label={component.label}
                    placeholder={
                        component.placeholder?.enabled
                            ? 'Enter your detailed response...'
                            : undefined
                    }
                />
            );

        case 'select':
            if (component.selectRange?.variant === 'scale' && component.selectRange.custom) {
                return (
                    <ScaleRating
                        id={`preview-${component.id}`}
                        label={component.label}
                        min={component.selectRange.custom.min}
                        max={component.selectRange.custom.max}
                        startLabel={component.selectRange.startLabel}
                        endLabel={component.selectRange.endLabel}
                        value={selectValue}
                        onChange={setSelectValue}
                    />
                );
            }

            return (
                <CustomSelect
                    id={`preview-${component.id}`}
                    label={component.label}
                    options={component.options || generateRangeOptions()}
                    placeholder="Select an option"
                    value={selectValue}
                    onChange={setSelectValue}
                />
            );

        case 'checkbox':
            return (
                <Checkbox
                    id={`preview-${component.id}`}
                    label={component.label}
                />
            );

        case 'radio':
            // Support both 'options' and 'choices' for radio components
            const radioOptions = (component as any).choices || component.options || [];
            return (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {component.label}
                    </label>
                    <div className="space-y-2">
                        {radioOptions.length > 0 ? (
                            radioOptions.map((option: { label?: string; value?: string }, index: number) => (
                                <div key={index} className="flex items-center">
                                    <input
                                        type="radio"
                                        id={`preview-${component.id}-${index}`}
                                        name={`preview-${component.id}`}
                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <label
                                        htmlFor={`preview-${component.id}-${index}`}
                                        className="ml-2 text-sm text-gray-700"
                                    >
                                        {option.label || option.value || `Option ${index + 1}`}
                                    </label>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 italic">No options configured</p>
                        )}
                    </div>
                </div>
            );

        case 'file-upload': {
            const FileUploadPreview = () => {
                const [files, setFiles] = useState<UploadedFile[]>([]);
                const [hitzoneModalOpen, setHitzoneModalOpen] = useState(false);
                const [hitzoneFile, setHitzoneFile] = useState<UploadedFile | null>(null);

                const handleFilesChange = (newFiles: UploadedFile[]): void => {
                    setFiles(newFiles);
                };

                const handleFileDelete = (fileId: string): void => {
                    setFiles((prev) => prev.filter((f) => f.id !== fileId));
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
                    setHitzoneModalOpen(false);
                    setHitzoneFile(null);
                };

                const isNavigationFlow = component.fileUpload?.allowHitZones ?? false;

                return (
                    <>
                        <FileUploadAdvanced
                            label={component.label}
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

            return <FileUploadPreview />;
        }

        default:
            return (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">
                        Unknown component type: {component.type}
                    </p>
                </div>
            );
    }
});
