import { Input } from '../ui/Input';
import type { BacklinkInputProps } from './researchConfigurationHelpers';

export const BacklinkInput = ({ label, value, onChange, error }: BacklinkInputProps) => (
    <div>
        <label className="block text-sm text-gray-700 mb-2">{label}</label>
        <div className="flex gap-1">
            <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                https://
            </span>
            <Input
                value={(value || '').replace(/^https?:\/\//, '')}
                onChange={(e) => onChange(e.target.value)}
                placeholder="www.useremotion.com/"
                className="rounded-l-none"
                error={error}
            />
        </div>
    </div>
);
