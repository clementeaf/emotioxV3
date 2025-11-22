import { useState } from 'react';
import { CreateResearchForm } from '../../components/research/CreateResearchForm';
import { CreateResearchTechniqueModal } from '../../components/research/CreateResearchTechniqueModal';
import { CreateEnterpriseModal } from '../../components/research/CreateEnterpriseModal';

/**
 * Main Research page
 * Create new researches
 */
export const ResearchPage = () => {
    const [showTechniqueModal, setShowTechniqueModal] = useState<boolean>(false);
    const [showEnterpriseModal, setShowEnterpriseModal] = useState<boolean>(false);

    return (
        <div className="h-full p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">Create Research</h1>
                <p className="mt-1 text-sm text-gray-500">Create new research projects</p>
            </div>

            <CreateResearchForm />

            <CreateResearchTechniqueModal
                isOpen={showTechniqueModal}
                onClose={() => setShowTechniqueModal(false)}
            />

            <CreateEnterpriseModal
                isOpen={showEnterpriseModal}
                onClose={() => setShowEnterpriseModal(false)}
            />
        </div>
    );
};
