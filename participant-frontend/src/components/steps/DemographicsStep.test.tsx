/**
 * @vitest-environment jsdom
 *
 * DemographicsStep renders form fields and persists answers via updateResponse.
 * It does NOT have a submit button — navigation is handled by ResearchPage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DemographicsStep } from './DemographicsStep';
import type { ModuleConfig } from '../../types/module';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}));

const mockUpdateResponse = vi.fn();
vi.mock('../../stores/useParticipantStore', () => ({
    useParticipantStore: () => ({
        updateResponse: mockUpdateResponse,
        getResponsesByModule: () => [],
    }),
}));

describe('DemographicsStep - Field Rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockModule: ModuleConfig = {
        id: 'test',
        name: 'Test Demographics',
        description: 'Test Description',
        structure: { components: [] },
        config: {
            demographics: {
                age: { enabled: true, validValues: ['18-25', '26-35', '36-45'] },
                country: { enabled: true, validValues: ['Chile', 'Other'] },
            },
        },
    };

    it('should render age and country selects from config', () => {
        render(<DemographicsStep module={mockModule} onComplete={vi.fn()} />);

        const ageTrigger = document.getElementById('age');
        const countryTrigger = document.getElementById('country');
        expect(ageTrigger).toBeTruthy();
        expect(countryTrigger).toBeTruthy();
    });

    it('should persist age selection via updateResponse', () => {
        render(<DemographicsStep module={mockModule} onComplete={vi.fn()} />);

        const ageTrigger = document.getElementById('age')!;
        fireEvent.click(ageTrigger);
        fireEvent.click(screen.getByText('18-25'));

        expect(mockUpdateResponse).toHaveBeenCalledWith('test', 'age', '18-25');
    });

    it('should persist country selection via updateResponse', () => {
        render(<DemographicsStep module={mockModule} onComplete={vi.fn()} />);

        const countryTrigger = document.getElementById('country')!;
        fireEvent.click(countryTrigger);
        fireEvent.click(screen.getByText('Chile'));

        expect(mockUpdateResponse).toHaveBeenCalledWith('test', 'country', 'Chile');
    });
});
