import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { CompanySelectWithCreate, Option } from '@/components/ui/CompanySelectWithCreate';
import { Company } from '../../../../../shared/interfaces/company.interface';

interface BasicInfoStepProps {
  formData: {
    name: string;
    companyId: string;
  };
  errors: Record<string, string>;
  companies: Company[];
  loadingCompanies: boolean;
  companiesError: string | null;
  onFieldChange: (field: string, value: string) => void;
  onCompanyCreated?: (newCompany: { id: string; name: string }) => void;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  formData,
  errors,
  companies,
  loadingCompanies,
  companiesError,
  onFieldChange,
  onCompanyCreated
}) => {
  // Preparar opciones para el selector personalizado
  const companyOptions: Option[] = companies
    .filter(company => company.status === 'active')
    .map(company => ({
      value: company.id,
      label: company.name
    }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Name the Research</h2>
        <p className="text-neutral-500 text-sm mb-6">
          Please, name the research project and assign it to an existing client or create a new one
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-neutral-900">
              Research's name
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              placeholder="Project 001"
              error={!!errors.name}
            />
            {errors.name && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Cannot continue</p>
                  <p className="text-sm text-red-700">{errors.name}. Please choose a different name to proceed to the next step.</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="companyId" className="block text-sm font-medium text-neutral-900">
              It&apos;s made for
            </label>
            <CompanySelectWithCreate
              id="companyId"
              value={formData.companyId}
              onChange={(value) => onFieldChange('companyId', value)}
              options={companyOptions}
              placeholder={loadingCompanies ? 'Loading companies...' : 'Select or create a company'}
              disabled={loadingCompanies}
              error={!!errors.companyId}
              className="bg-white"
              onCompanyCreated={onCompanyCreated}
            />
            {companiesError && !loadingCompanies && (
              <p className="text-sm text-yellow-600">
                ⚠️ Could not load companies from server. Using fallback options.
              </p>
            )}
            {errors.companyId && (
              <p className="text-sm text-red-500">{errors.companyId}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};