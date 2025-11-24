import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { CustomSelect } from '../ui/CustomSelect';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

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

        default:
            return (
                <div className="text-sm text-gray-500">
                    Component type "{component.type}" is not supported for editing
                </div>
            );
    }
};

