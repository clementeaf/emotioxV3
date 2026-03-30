import { Trash2, Plus } from 'lucide-react';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import {
    isImplicitAssociationModuleName,
    partitionImplicitAssociationTargets,
    type IatTargetColumn,
} from '../../utils/implicitAssociationBuilder';
import { isScreenerMultipleChoiceSelection, isScreenerSingleChoiceSelection } from '../../utils/screenerBuilder';
import { EditableComponent } from './EditableComponent';

interface ModuleContentEditorProps {
    components: ComponentConfig[];
    componentValues: Record<string, string>;
    onValueChange: (componentId: string, value: string) => void;
    onAddChoiceComponent?: (groupLabel: string, siblingComponent: ComponentConfig) => void;
    onRemoveChoiceComponent?: (componentId: string) => void;
    researchId?: string; // For S3 upload in file-upload components
    /** When "Screener", first input + select + checkbox row renders on one line (Question, Choice Type, Enable last). */
    moduleName?: string;
}

type ProcessedItem =
    | { type: 'group'; groupLabel: string; components: ComponentConfig[] }
    | { type: 'single'; component: ComponentConfig }
    | { type: 'screener-header'; components: [ComponentConfig, ComponentConfig, ComponentConfig] }
    | { type: 'iat-targets-row'; columns: IatTargetColumn[] };

/**
 * Finds the Screener header controls by component type (not JSON array order).
 * Uses the first input, first select, and first checkbox by `order` among visible components.
 * @param components - Visible module components (already sorted by order)
 * @returns [Question input, Choice Type select, Enable checkbox] or null if any type is missing
 */
function findScreenerHeaderTriplet(
    components: ComponentConfig[]
): [ComponentConfig, ComponentConfig, ComponentConfig] | null {
    const sorted = [...components].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const input = sorted.find((c) => c.type === 'input');
    const select = sorted.find((c) => c.type === 'select');
    const checkbox = sorted.find((c) => c.type === 'checkbox');
    if (!input || !select || !checkbox) {
        return null;
    }
    return [input, select, checkbox];
}

/**
 * Groups components into singles and choice groups (same logic as builder list).
 * @param visibleComponents - Filtered visible components
 * @returns Processed items for rendering
 */
function buildProcessedItems(visibleComponents: ComponentConfig[]): ProcessedItem[] {
    const processedComponents: ProcessedItem[] = [];
    let currentGroup: { groupLabel: string; components: ComponentConfig[] } | null = null;

    visibleComponents.forEach((component) => {
        const groupLabel = component.settings?.groupLabel;
        const isChoice = component.settings?.isChoice;

        if (groupLabel && isChoice) {
            if (currentGroup && currentGroup.groupLabel === groupLabel) {
                currentGroup.components.push(component);
            } else {
                if (currentGroup) {
                    processedComponents.push({
                        type: 'group',
                        groupLabel: currentGroup.groupLabel,
                        components: currentGroup.components,
                    });
                }
                currentGroup = { groupLabel, components: [component] };
            }
        } else {
            if (currentGroup) {
                processedComponents.push({
                    type: 'group',
                    groupLabel: currentGroup.groupLabel,
                    components: currentGroup.components,
                });
                currentGroup = null;
            }
            processedComponents.push({ type: 'single', component });
        }
    });

    if (currentGroup !== null) {
        const groupToAdd: { groupLabel: string; components: ComponentConfig[] } = currentGroup;
        processedComponents.push({ type: 'group', groupLabel: groupToAdd.groupLabel, components: groupToAdd.components });
    }

    return processedComponents;
}

/**
 * Editor de contenido de módulo
 * Renderiza todos los componentes editables del módulo
 */
export const ModuleContentEditor = ({
    components,
    componentValues,
    onValueChange,
    onAddChoiceComponent,
    onRemoveChoiceComponent,
    researchId,
    moduleName,
}: ModuleContentEditorProps) => {
    const visibleComponents = components
        .filter(c => !c.hidden)
        .sort((a, b) => {
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;
            return orderA - orderB;
        });

    if (visibleComponents.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-gray-500">No components configured for this module.</p>
            </div>
        );
    }

    const isScreener = moduleName?.trim().toLowerCase() === 'screener';
    const headerTriplet = isScreener ? findScreenerHeaderTriplet(visibleComponents) : null;
    const headerIds = headerTriplet
        ? new Set([headerTriplet[0].id, headerTriplet[1].id, headerTriplet[2].id])
        : null;
    const componentsForList = headerIds
        ? visibleComponents.filter((c) => !headerIds.has(c.id))
        : visibleComponents;

    const isIatModule = isImplicitAssociationModuleName(moduleName);
    const { columns: iatColumns, rest: componentsAfterIat } = isIatModule
        ? partitionImplicitAssociationTargets(visibleComponents)
        : { columns: [], rest: visibleComponents };

    let displayItems: ProcessedItem[];
    if (headerTriplet) {
        displayItems = [
            { type: 'screener-header', components: headerTriplet },
            ...buildProcessedItems(componentsForList),
        ];
    } else if (isIatModule && iatColumns.length > 0) {
        displayItems = [{ type: 'iat-targets-row', columns: iatColumns }, ...buildProcessedItems(componentsAfterIat)];
    } else {
        displayItems = buildProcessedItems(visibleComponents);
    }

    const choiceTypeComp = headerTriplet?.[1];
    const rawChoiceType = choiceTypeComp ? (componentValues[choiceTypeComp.id] ?? '') : '';
    const screenerSingleChoiceLocked =
        isScreener && choiceTypeComp
            ? isScreenerSingleChoiceSelection(choiceTypeComp, rawChoiceType)
            : false;
    const screenerMultipleChoiceMinOptions =
        isScreener && choiceTypeComp && isScreenerMultipleChoiceSelection(choiceTypeComp, rawChoiceType)
            ? 3
            : undefined;

    return (
        <div className="space-y-6">
            {displayItems.map((item, index) => {
                if (item.type === 'iat-targets-row' && item.columns.length > 0) {
                    const colCount = item.columns.length;
                    const rowGridClass =
                        colCount <= 3
                            ? 'grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start'
                            : colCount <= 4
                              ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:items-start'
                              : 'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 md:items-start';
                    return (
                        <div key={`iat-targets-${index}`} className={rowGridClass}>
                            {item.columns.map((col) => {
                                const heading =
                                    col.components[0]?.settings?.groupLabel != null
                                        ? String(col.components[0].settings.groupLabel)
                                        : `Target ${col.index}`;
                                return (
                                    <div
                                        key={col.index}
                                        className="min-w-0 space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                                    >
                                        <div className="border-b border-gray-100 pb-2 text-sm font-semibold text-gray-800">
                                            {heading}
                                        </div>
                                        {col.components.map((comp) => (
                                            <div key={comp.id} className="min-w-0 space-y-2">
                                                <EditableComponent
                                                    component={comp}
                                                    value={componentValues[comp.id] || ''}
                                                    onChange={(value) => onValueChange(comp.id, value)}
                                                    researchId={researchId}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    );
                }
                if (item.type === 'group' && item.components) {
                    const canModifyChoices = !!onAddChoiceComponent && !!onRemoveChoiceComponent;
                    const choiceRows =
                        screenerSingleChoiceLocked && isScreener ? item.components.slice(0, 1) : item.components;
                    const showRemoveRow =
                        canModifyChoices &&
                        item.components.length > 2 &&
                        !screenerSingleChoiceLocked;
                    return (
                        <div key={`group-${index}`} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <label className="block text-sm font-medium text-gray-700 mb-4">
                                {item.groupLabel}
                            </label>
                            <div className="space-y-3">
                                {choiceRows.map((component) => {
                                    const componentValue = componentValues[component.id] || '';
                                    return (
                                        <div key={component.id} className="flex items-start gap-2">
                                            <div className="flex-1">
                                                <EditableComponent
                                                    component={component}
                                                    value={componentValue}
                                                    onChange={(value) => onValueChange(component.id, value)}
                                                    researchId={researchId}
                                                    screenerSingleChoiceLocked={screenerSingleChoiceLocked}
                                                    screenerMultipleChoiceMinOptions={screenerMultipleChoiceMinOptions}
                                                />
                                            </div>
                                            {showRemoveRow && (
                                                <button
                                                    onClick={() => onRemoveChoiceComponent(component.id)}
                                                    className="mt-1 p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="Remove option"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                                {canModifyChoices && !screenerSingleChoiceLocked && (
                                    <button
                                        onClick={() => onAddChoiceComponent(item.groupLabel, item.components[item.components.length - 1])}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add another choice
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                } else if (item.type === 'screener-header') {
                    const [questionComp, choiceTypeComp, enableComp] = item.components;
                    return (
                        <div
                            key="screener-header-row"
                            className="flex min-w-0 flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-center lg:gap-6"
                        >
                            <div className="min-w-0 flex-1">
                                <EditableComponent
                                    component={questionComp}
                                    value={componentValues[questionComp.id] || ''}
                                    onChange={(value) => onValueChange(questionComp.id, value)}
                                    researchId={researchId}
                                    fieldLayout="inline"
                                    screenerSingleChoiceLocked={screenerSingleChoiceLocked}
                                    screenerMultipleChoiceMinOptions={screenerMultipleChoiceMinOptions}
                                />
                            </div>
                            <div className="min-w-0 shrink-0 sm:max-w-xs">
                                <EditableComponent
                                    component={choiceTypeComp}
                                    value={componentValues[choiceTypeComp.id] || ''}
                                    onChange={(value) => onValueChange(choiceTypeComp.id, value)}
                                    researchId={researchId}
                                    fieldLayout="inline"
                                    screenerSingleChoiceLocked={screenerSingleChoiceLocked}
                                    screenerMultipleChoiceMinOptions={screenerMultipleChoiceMinOptions}
                                />
                            </div>
                            <div className="shrink-0 lg:ml-auto">
                                <EditableComponent
                                    component={enableComp}
                                    value={componentValues[enableComp.id] || ''}
                                    onChange={(value) => onValueChange(enableComp.id, value)}
                                    researchId={researchId}
                                    fieldLayout="inline"
                                    screenerSingleChoiceLocked={screenerSingleChoiceLocked}
                                    screenerMultipleChoiceMinOptions={screenerMultipleChoiceMinOptions}
                                />
                            </div>
                        </div>
                    );
                } else if (item.type === 'single' && item.component) {
                    const componentValue = componentValues[item.component.id] || '';
                    return (
                        <div key={item.component.id} className="space-y-2">
                            <EditableComponent
                                component={item.component}
                                value={componentValue}
                                onChange={(value) => onValueChange(item.component!.id, value)}
                                researchId={researchId}
                                screenerSingleChoiceLocked={screenerSingleChoiceLocked}
                                screenerMultipleChoiceMinOptions={screenerMultipleChoiceMinOptions}
                            />
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
};

