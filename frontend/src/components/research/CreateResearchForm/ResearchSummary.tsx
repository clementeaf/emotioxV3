import React from 'react';
import { Company } from '../../../../../shared/interfaces/company.interface';

interface ResearchSummaryProps {
  formData: {
    name: string;
    companyId: string;
    type?: string;
    technique?: string;
  };
  companies: Company[];
  countdown: number;
}

export const ResearchSummary: React.FC<ResearchSummaryProps> = ({
  formData,
  companies,
  countdown
}) => {
  const getCompanyName = () => {
    const company = companies.find(c => c.id === formData.companyId);
    return company?.name || 'Unknown Company';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
          Research Created Successfully!
        </h2>
        <p className="text-neutral-600 mb-6">
          Your research has been created. You will be redirected to the configuration page in {countdown} seconds.
        </p>
      </div>

      <div className="bg-neutral-50 rounded-lg p-4">
        <h3 className="font-medium text-neutral-900 mb-3">Research Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Nombre:</span>
            <span>{formData.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Empresa:</span>
            <span>{getCompanyName()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Tipo de investigación:</span>
            <span>Behavioural Research</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Técnica:</span>
            <span>AIM Framework Stage 3</span>
          </div>
        </div>
      </div>
    </div>
  );
};