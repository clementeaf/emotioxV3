import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ui/Button';

interface ResearchConfirmationProps {
  researchId: string;
  researchName: string;
  onClose?: () => void;
}

export function ResearchConfirmation({
  researchId,
  researchName,
  onClose
}: ResearchConfirmationProps) {
  const router = useRouter();

  const handleGoToDashboard = () => {
    console.log('🔴 handleGoToDashboard clicked');
    router.push('/dashboard');
  };

  const handleGoToResearch = () => {
    console.log('🔴 handleGoToResearch clicked, researchId:', researchId);
    router.push(`/dashboard?research=${researchId}`);
  };

  const handleGoToAimFramework = () => {
    console.log('🔴 handleGoToAimFramework clicked, researchId:', researchId);
    router.push(`/dashboard?research=${researchId}&aim=true&section=welcome-screen`);
  };

  return (
    <div className="p-6 flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <div className="h-8 w-8 text-green-600">✓</div>
      </div>
      <h2 className="text-2xl font-bold mb-1">Research Created!</h2>
      <p className="text-neutral-500 mb-6">
        Your research "{researchName}" has been created successfully.
      </p>

      <div className="space-y-3 w-full">
        <button
          onClick={handleGoToResearch}
          className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Continue to Research
        </button>

        <button
          onClick={handleGoToAimFramework}
          className="w-full border border-gray-300 py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Go to AIM Framework
        </button>

        <button
          onClick={handleGoToDashboard}
          className="w-full py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
} 