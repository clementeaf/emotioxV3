import React from 'react';
import { FormInput } from '@/components/common/FormInput';
import { FormTextarea } from '@/components/common/FormTextarea';
import { FormSelect } from '@/components/common/FormSelect';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { LabeledInput } from '@/components/common/LabeledInput';
import { ScaleSelector } from '@/components/common/ScaleSelector';
import { FieldConfig } from '../config';

interface DynamicFieldRendererProps {
  field: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  field,
  value,
  onChange,
  disabled = false
}) => {
  const commonProps = {
    label: field.label,
    value: value || '',
    onChange,
    placeholder: field.placeholder,
    disabled
  };

  switch (field.component) {
    case 'FormInput':
      return <FormInput {...commonProps} />;

    case 'FormTextarea':
      return (
        <FormTextarea
          {...commonProps}
          rows={field.rows || 3}
        />
      );

    case 'FormSelect':
      return (
        <FormSelect
          {...commonProps}
          options={field.options || []}
        />
      );

    case 'CustomSelect':
      // Manejar scaleRange que viene como objeto { start, end } pero CustomSelect espera string
      let selectValue: string;
      if (field.name === 'config.scaleRange' && value && typeof value === 'object' && 'start' in value && 'end' in value) {
        // Convertir objeto scaleRange a string "start-end"
        selectValue = `${value.start}-${value.end}`;
      } else {
        selectValue = value || '';
      }

      const handleCustomSelectChange = (selectedValue: string) => {
        if (field.name === 'config.scaleRange') {
          // Convertir string "start-end" a objeto { start, end }
          const [start, end] = selectedValue.split('-').map(Number);
          onChange({ start, end });
        } else {
          onChange(selectedValue);
        }
      };

      return (
        <div>
          {field.label && (
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
            </label>
          )}
          <CustomSelect
            value={selectValue}
            onChange={handleCustomSelectChange}
            options={field.options || []}
            placeholder={field.placeholder || 'Seleccionar opción'}
            disabled={disabled}
          />
        </div>
      );

    case 'LabeledInput':
      return (
        <LabeledInput
          {...commonProps}
          label={field.label}
        />
      );

    case 'ScaleSelector':
      return (
        <ScaleSelector
          value={value || { start: 1, end: 5 }}
          onChange={onChange}
          options={field.options?.map(opt => ({ value: opt.value, label: opt.label }))}
          disabled={disabled}
        />
      );

    default:
      return <div>Componente no soportado: {field.component}</div>;
  }
};
