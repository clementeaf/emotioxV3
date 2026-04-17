import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { CustomSelect } from '../ui/CustomSelect';
import { Toggle } from '../ui/Toggle';
import { MultiLangInput } from './MultiLangInput';
import { RadioChoicesEditor } from './RadioChoicesEditor';
import { RankingItemsEditor } from './RankingItemsEditor';
import { IATCriteriaEditor } from './IATCriteriaEditor';
import { FileUploadEditorComponent } from './FileUploadEditorComponent';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

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
