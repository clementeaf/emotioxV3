import { FormField } from '@/components/forms/FormField';

interface ValidatedFormFieldProps {
  id: string;
  label: string;
  type: 'email' | 'password' | 'text';
  value: string;
  onChange: (value: string) => void;
  validation: {
    isValid: boolean;
    message: string | null;
  };
  required?: boolean;
  placeholder?: string;
}

export const ValidatedFormField = ({
  validation,
  ...formFieldProps
}: ValidatedFormFieldProps) => {
  return (
    <div>
      <FormField {...formFieldProps} />
      {!validation.isValid && validation.message && (
        <p className="mt-1 text-sm text-red-600">{validation.message}</p>
      )}
    </div>
  );
};
