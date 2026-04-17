import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FileUploadAdvanced, type UploadedFile } from '../ui/FileUploadAdvanced';
import { LocalHitzoneEditor, type HitzoneArea } from '../ui/LocalHitzoneEditor';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

interface FileUploadEditorProps {
    component: ComponentConfig;
    value: string;
    onChange: (value: string) => void;
    researchId?: string;
}

export const FileUploadEditorComponent = ({ component, value, onChange, researchId }: FileUploadEditorProps) => {
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
