import { PreviewComponent } from './PreviewComponent';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

interface LivePreviewPanelProps {
    moduleName: string;
    moduleDescription?: string;
    components: ComponentConfig[];
}

export const LivePreviewPanel = ({
    moduleName,
    moduleDescription,
    components
}: LivePreviewPanelProps) => {
    const visibleComponents = components.filter(c => !c.hidden);

    return (
        <div className="h-full max-h-[800px] flex flex-col overflow-hidden">
            {/* Preview Header */}
            <div className="sticky top-0 bg-blue-600 text-white p-4 z-10 rounded-t-lg">
                <h2 className="text-lg font-semibold">
                    {moduleName || 'Untitled Module'}
                </h2>
                {moduleDescription && (
                    <p className="text-sm text-blue-100 mt-1">{moduleDescription}</p>
                )}
            </div>

            {/* Preview Content */}
            <div className="h-full p-6">
                {visibleComponents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="text-4xl mb-4 font-light">No components yet</div>
                        <p className="text-sm mt-2">Add components to see the preview</p>
                    </div>
                ) : (
                    visibleComponents.map((component, index) => (
                        <div
                            key={component.id}
                            className="bg-white rounded-lg p-4 border border-gray-200 transition-all hover:shadow-md"
                        >
                            <div className="text-xs text-gray-400 mb-2 font-medium">
                                Component {index + 1}
                            </div>
                            <PreviewComponent component={component} />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
