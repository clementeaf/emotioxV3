import { Trash2, Plus } from 'lucide-react';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import {
    isImplicitAssociationModuleName,
    partitionImplicitAssociationTargets,
    type IatTargetColumn,
} from '../../utils/implicitAssociationBuilder';
import { isScreenerMultipleChoiceSelection, isScreenerSingleChoiceSelection } from '../../utils/screenerBuilder';
import { EditableComponent } from './EditableComponent';
import { CustomSelect } from '../ui/CustomSelect';
import { AOIDrawer, type AOI } from './AOIDrawer';
import { resolveMediaUrl } from '../../services/media.service';

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

    const normalizedModuleName = moduleName?.trim().toLowerCase() ?? '';
    const isEyeTracking = normalizedModuleName === 'eye tracking';
    const isAttributeTesting = normalizedModuleName === 'attribute testing';
    const isComparingAttribute = normalizedModuleName === 'comparing attribute';
    const isObjectsComparing = normalizedModuleName === 'objects comparing' || normalizedModuleName === 'object comparing';
    const hasIatNotes = isAttributeTesting || isComparingAttribute || isObjectsComparing;

    // Extract IAT target options for the criteria editor (target selector)
    // Always show "Target 1", "Target 2", etc. — not the object name (which may be empty)
    const iatTargetOptions = isIatModule
        ? iatColumns.map((col) => {
              const heading =
                  col.components[0]?.settings?.groupLabel != null
                      ? String(col.components[0].settings.groupLabel)
                      : `Target ${col.index}`;
              return { id: heading, name: heading };
          })
        : [];

    const builderContent = (
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
                                iatTargets={iatTargetOptions}
                            />
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );

    // Eye Tracking: 3-column layout — stimuli (left), config (center), notes (right)
    if (isEyeTracking) {
        const instructionComp = visibleComponents.find(c => c.id === 'task-instructions');
        const stimuliComp = visibleComponents.find(c => c.type === 'file-upload');
        const toggleComps = visibleComponents.filter(c => c.type === 'checkbox' && c.id !== 'randomize-stimuli');
        const primingComp = visibleComponents.find(c => c.id === 'priming-time');

        // AOI state: parse from component value, serialize back on change
        const aoisRaw = componentValues['aois'] || '[]';
        let parsedAois: AOI[] = [];
        try { parsedAois = JSON.parse(aoisRaw); } catch { /* keep empty */ }

        // Resolve first stimulus image URL for AOI drawing
        const stimuliRaw = stimuliComp ? (componentValues[stimuliComp.id] || '') : '';
        let firstStimulusUrl = '';
        try {
            const parsed = JSON.parse(stimuliRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const first = parsed[0] as { url?: string; s3Key?: string };
                const raw = first.url || first.s3Key || '';
                firstStimulusUrl = raw ? resolveMediaUrl(raw) : '';
            }
        } catch { /* no stimulus yet */ }

        return (
            <div className="space-y-6">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[280px_1fr_240px]">
                {/* Instruction spans left + center columns — rendered as input, not textarea */}
                {instructionComp && (
                    <div className="lg:col-span-2">
                        <EditableComponent
                            component={{ ...instructionComp, type: 'input' }}
                            value={componentValues[instructionComp.id] || ''}
                            onChange={(value) => onValueChange(instructionComp.id, value)}
                            researchId={researchId}
                        />
                    </div>
                )}
                {/* Empty cell for the notes column on the instruction row */}
                {instructionComp && <div className="hidden lg:block" />}

                {/* Left: Stimuli upload + file list */}
                    <div className="space-y-3" style={{ minHeight: 380 }}>
                        {stimuliComp && (
                            <EditableComponent
                                component={{ ...stimuliComp, settings: { ...stimuliComp.settings, listOnly: true } }}
                                value={componentValues[stimuliComp.id] || ''}
                                onChange={(value) => onValueChange(stimuliComp.id, value)}
                                researchId={researchId}
                            />
                        )}
                        {/* For Shelf only: Randomize */}
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-900 mb-2">For Shelf only:</p>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-blue-600"
                                    checked={componentValues['randomize-stimuli'] === 'true'}
                                    onChange={(e) => onValueChange('randomize-stimuli', e.target.checked ? 'true' : 'false')}
                                />
                                <span className="font-medium">Randomize options (images)</span>
                            </label>
                        </div>
                    </div>

                    {/* Center: Task configuration + Priming + Shelf */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-3">
                            <h4 className="text-sm font-semibold text-gray-900">Task configuration</h4>
                            <span className="text-xs text-gray-400">Please select</span>
                        </div>
                        {/* Checkboxes (not toggles) */}
                        <div className="space-y-3">
                            {toggleComps.map(comp => (
                                <label key={comp.id} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 h-4 w-4"
                                        checked={componentValues[comp.id] === 'true'}
                                        onChange={(e) => onValueChange(comp.id, e.target.checked ? 'true' : 'false')}
                                    />
                                    {comp.label}
                                </label>
                            ))}
                        </div>
                        {/* Priming display time as tab buttons */}
                        {primingComp && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">{primingComp.label}</label>
                                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                                    {(primingComp.options || []).map((opt: { label: string; value: string }) => {
                                        const selected = (componentValues[primingComp.id] || primingComp.value || '10') === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => onValueChange(primingComp.id, opt.value)}
                                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                                    selected
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                                } border-r border-gray-200 last:border-r-0`}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {/* Shelf configuration — always visible */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4" style={{ width: 390, minHeight: 352 }}>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Shelf configuration</h4>
                            <div className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-white flex items-center justify-center" style={{ height: 220 }}>
                                <div className="text-center text-gray-400">
                                    <svg className="mx-auto h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                    </svg>
                                    <p className="text-sm">Shelf preview</p>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-4">
                                <div className="flex-1">
                                    <CustomSelect
                                        label="Number of Shelfs"
                                        value={componentValues['shelf-count'] || '2'}
                                        onChange={(val) => onValueChange('shelf-count', val)}
                                        options={[1, 2, 3, 4, 5].map(n => ({ value: String(n), label: String(n) }))}
                                    />
                                </div>
                                <div className="flex-1">
                                    <CustomSelect
                                        label="Items per Shelf"
                                        value={componentValues['shelf-items'] || '5'}
                                        onChange={(val) => onValueChange('shelf-items', val)}
                                        options={[3, 4, 5, 6, 7, 8, 10].map(n => ({ value: String(n), label: String(n) }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Techniques notes panel */}
                    <aside className="space-y-4">
                        <div className="bg-blue-600 text-white rounded-lg p-4">
                            <h4 className="text-sm font-bold mb-1">Techniques</h4>
                            <p className="text-xs text-blue-100">
                                Get started with notes for better consumer neurosciences research
                            </p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                            <p className="text-sm font-semibold text-gray-900">Biometrics:</p>
                            <p className="text-sm text-gray-700">Eye Tracking</p>
                            <p className="text-xs font-semibold text-red-600 mt-2">Notes:</p>
                            <p className="text-xs text-gray-600">
                                All Eye Tracking tasks include Emotion and Attention measurement.
                            </p>
                            <p className="text-xs text-gray-600">
                                <strong>Eye Tracking</strong> shows what engages people visually. This uncovers nonconscious reactions to visual stimuli that oftentimes is not articulated in survey data alone.
                            </p>
                            <p className="text-xs text-gray-600">
                                <strong>Gaze tracking</strong> reveals what is noticed, what is engaging, and what is not. This allows brands to optimize marketing concepts and assets for both conscious and nonconscious impact.
                            </p>
                        </div>
                    </aside>
                </div>

                {/* AOI Drawing — shown when a stimulus image is uploaded */}
                {firstStimulusUrl && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Areas of Interest (AOI)</h4>
                        <p className="text-xs text-gray-500 mb-3">
                            Draw rectangular regions on the stimulus to define areas of interest for analytics.
                        </p>
                        <AOIDrawer
                            imageUrl={firstStimulusUrl}
                            aois={parsedAois}
                            onChange={(newAois) => onValueChange('aois', JSON.stringify(newAois))}
                            maxHeight={400}
                        />
                    </div>
                )}
            </div>
        );
    }

    if (!hasIatNotes) {
        return builderContent;
    }

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
            {builderContent}
            <aside className="space-y-4">
                {isAttributeTesting && (
                    <>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">Notes:</h4>
                            <p className="text-sm font-medium text-blue-800 mb-1">Target Objects</p>
                            <p className="text-sm text-blue-700 mb-3">
                                You can add items that describe your objects in the best way. Please see the example:
                            </p>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <p className="text-sm font-semibold text-blue-800 mb-1">Object A:</p>
                                    <ul className="text-sm text-blue-700 space-y-0.5">
                                        <li>Name A</li>
                                        <li>Logo A</li>
                                        <li>Image A</li>
                                    </ul>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-blue-800 mb-1">Object B:</p>
                                    <ul className="text-sm text-blue-700 space-y-0.5">
                                        <li>Name B</li>
                                        <li>Logo B</li>
                                        <li>Image B</li>
                                    </ul>
                                </div>
                            </div>
                            <p className="text-xs text-blue-600">
                                Respondent will see the names of main objects on the buttons, while their items (Logo, Brand name, Product image, etc) will appear on the screen.
                            </p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">Criteria</h4>
                            <p className="text-sm text-gray-600 mb-1">
                                You can add up to 5 characteristics. For example, Tasty, Expensive, Innovative, etc.
                            </p>
                            <p className="text-xs text-gray-500">
                                The respondent will see added criteria before each object appeared during the test.
                            </p>
                        </div>
                    </>
                )}
                {isComparingAttribute && (
                    <>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">Notes:</h4>
                            <p className="text-sm font-medium text-blue-800 mb-1">Object</p>
                            <p className="text-sm text-blue-700 mb-3">
                                You can add up to 3 objects. For example, MacOS, Windows, Android, etc.
                            </p>
                            <p className="text-xs text-blue-600 mb-4">
                                The respondent will see added criteria before each object appeared during the test.
                            </p>
                            <p className="text-sm font-medium text-blue-800 mb-1">Dimensions:</p>
                            <p className="text-sm text-blue-700 mb-3">
                                Dimensions&apos; names appear with objects to be exposes with criteria attribute.
                            </p>
                            <p className="text-xs text-blue-600">
                                Respondent will see the names of main objects on the buttons, while their items (Logo, Brand name, Product image, etc) will appear on the screen.
                            </p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">Criteria</h4>
                            <p className="text-sm text-gray-600 mb-1">
                                You can add up to 15 characteristics. For example, Tasty, Expensive, Innovative, etc.
                            </p>
                            <p className="text-xs text-gray-500">
                                The respondent will see added criteria before each object appeared during the test.
                            </p>
                        </div>
                    </>
                )}
                {isObjectsComparing && (
                    <>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">Notes:</h4>
                            <p className="text-sm font-medium text-blue-800 mb-1">Target Objects</p>
                            <p className="text-sm text-blue-700 mb-3">
                                You can add up to 5 objects. For example, MacOS, Windows, Android, etc.
                            </p>
                            <p className="text-xs text-blue-600">
                                Respondent will see the added object before each criterion appeared during the test.
                            </p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Criteria</h4>
                            <p className="text-sm text-gray-600 mb-3">
                                You can add attributes that describe your criteria in the best way. Please see the example:
                            </p>
                            <p className="text-sm font-semibold text-green-700 mb-1">Satisfaction</p>
                            <ul className="text-sm text-gray-600 space-y-0.5 mb-3">
                                <li>Acceptable price</li>
                                <li>High quality</li>
                                <li>Like it</li>
                            </ul>
                            <p className="text-sm font-semibold text-red-700 mb-1">Dissatisfaction</p>
                            <ul className="text-sm text-gray-600 space-y-0.5 mb-3">
                                <li>Unacceptable price</li>
                                <li>Low quality</li>
                                <li>Dislike it</li>
                            </ul>
                            <p className="text-xs text-gray-500">
                                Respondent will see the names of main criteria on the button, while their attributes will appear on the screen.
                            </p>
                        </div>
                    </>
                )}
            </aside>
        </div>
    );
};

