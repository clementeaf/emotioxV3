interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const CheckboxField = ({ id, label, checked, onChange }: CheckboxFieldProps) => {
  return (
    <div className="flex items-center">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
      />
      <label htmlFor={id} className="ml-2 block text-sm text-neutral-700">
        {label}
      </label>
    </div>
  );
};
