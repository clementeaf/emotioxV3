/**
 * @vitest-environment jsdom
 *
 * Regression: country.cities as { name, country } must not be passed as React children (error #31).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DemographicsStep } from './DemographicsStep';
import type { ModuleConfig } from '../../types/module';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}));

vi.mock('../../stores/useParticipantStore', () => ({
    useParticipantStore: () => ({
        updateResponse: vi.fn(),
        getResponsesByModule: () => [
            {
                id: 'demo_country',
                moduleId: 'demo',
                componentId: 'country',
                value: 'México',
            },
        ],
    }),
}));

describe('DemographicsStep - country + city object entries', () => {
    it('shows city options as strings when cities are stored as objects', () => {
        const module: ModuleConfig = {
            id: 'demo',
            name: 'Demographics',
            description: '',
            structure: { components: [] },
            config: {
                demographics: {
                    country: {
                        enabled: true,
                        granularity: 'countryCity',
                        validValues: ['México'],
                        cities: [{ name: 'CDMX', country: 'México' }],
                    },
                },
            },
        };

        render(<DemographicsStep module={module} onComplete={vi.fn()} />);

        const cityTrigger = document.getElementById('city');
        expect(cityTrigger).toBeTruthy();
        fireEvent.click(cityTrigger!);

        expect(screen.getByText('CDMX — México')).toBeTruthy();
    });
});
