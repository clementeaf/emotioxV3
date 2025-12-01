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
        <div className="h-full flex flex-col">
            {/* Preview Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-md z-10">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-xs font-medium uppercase tracking-wide">Live Preview</span>
                </div>
                <h2 className="text-lg font-semibold">
                    {moduleName || 'Untitled Module'}
                </h2>
                {moduleDescription && (
                    <p className="text-sm text-blue-100 mt-1">{moduleDescription}</p>
                )}
            </div>

            {/* Preview Content */}
            <div className="flex-1 p-6 space-y-6 bg-gray-50 overflow-y-auto">
                {visibleComponents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="text-4xl mb-4 font-light">No components yet</div>
                        <p className="text-sm mt-2">Add components to see the preview</p>
                    </div>
                ) : (
                    visibleComponents.map((component, index) => (
                        <div
                            key={component.id}
                            className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 transition-all hover:shadow-md"
                        >
                            <div className="text-xs text-gray-400 mb-2 font-medium">
                                Component {index + 1}
                            </div>
                            <PreviewComponent component={component} />
                        </div>
                    ))
                )}
            </div>

            {/* Preview Footer */}
            <div className="sticky bottom-0 bg-white border-t p-4 z-10">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium">
                        {visibleComponents.length} component{visibleComponents.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-400">Preview updates in real-time</span>
                </div>
            </div>
        </div>
    );
};
