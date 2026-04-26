import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Filters } from '../Filters';
import type { DemographicResponsesResult } from '../../../../services/analytics.service';

const mockDemographicData: DemographicResponsesResult = {
    participants: [
        { participantId: 'p1', demographics: { gender: 'Male', age: '25-34' } },
        { participantId: 'p2', demographics: { gender: 'Female', age: '25-34' } },
        { participantId: 'p3', demographics: { gender: 'Male', age: '35-44' } },
        { participantId: 'p4', demographics: { gender: 'Female', age: '18-24' } },
    ],
    demographicTypes: ['gender', 'age'],
};

describe('Filters', () => {
    it('renders filter title', () => {
        render(
            <Filters
                researchId="r1"
                demographicData={mockDemographicData}
                selectedFilters={{}}
                onFilterChange={() => {}}
            />
        );

        expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('renders demographic type labels', () => {
        render(
            <Filters
                researchId="r1"
                demographicData={mockDemographicData}
                selectedFilters={{}}
                onFilterChange={() => {}}
            />
        );

        expect(screen.getByText('Gender')).toBeInTheDocument();
        expect(screen.getByText('Age range')).toBeInTheDocument();
    });

    it('renders demographic options with counts', () => {
        render(
            <Filters
                researchId="r1"
                demographicData={mockDemographicData}
                selectedFilters={{}}
                onFilterChange={() => {}}
            />
        );

        expect(screen.getByText(/Male/)).toBeInTheDocument();
        expect(screen.getByText(/Female/)).toBeInTheDocument();
        expect(screen.getByText(/25-34/)).toBeInTheDocument();
    });

    it('calls onFilterChange when checkbox toggled', async () => {
        const user = userEvent.setup();
        const onFilterChange = vi.fn();

        render(
            <Filters
                researchId="r1"
                demographicData={mockDemographicData}
                selectedFilters={{}}
                onFilterChange={onFilterChange}
            />
        );

        // Click "Male" checkbox
        const checkboxes = screen.getAllByRole('checkbox');
        await user.click(checkboxes[0]);

        expect(onFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({ gender: ['Male'] })
        );
    });

    it('shows completion slider when onCompletionMinChange provided', () => {
        render(
            <Filters
                researchId="r1"
                demographicData={mockDemographicData}
                selectedFilters={{}}
                onFilterChange={() => {}}
                completionMin={50}
                onCompletionMinChange={() => {}}
            />
        );

        expect(screen.getByText('Min. completion')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows sentiment filter when onSentimentFilterChange provided', () => {
        render(
            <Filters
                researchId="r1"
                demographicData={mockDemographicData}
                selectedFilters={{}}
                onFilterChange={() => {}}
                sentimentFilter={[]}
                onSentimentFilterChange={() => {}}
            />
        );

        expect(screen.getByText('Sentiment')).toBeInTheDocument();
        expect(screen.getByText('Positive')).toBeInTheDocument();
        expect(screen.getByText('Negative')).toBeInTheDocument();
        expect(screen.getByText('Neutral')).toBeInTheDocument();
    });

    it('shows message when no researchId', () => {
        render(
            <Filters
                selectedFilters={{}}
                onFilterChange={() => {}}
            />
        );

        expect(screen.getByText('Select a study to see demographic filters.')).toBeInTheDocument();
    });

    it('shows empty state when no demographic data', () => {
        const emptyData: DemographicResponsesResult = {
            participants: [],
            demographicTypes: [],
        };

        render(
            <Filters
                researchId="r1"
                demographicData={emptyData}
                selectedFilters={{}}
                onFilterChange={() => {}}
            />
        );

        expect(screen.getByText('No demographic responses for this study.')).toBeInTheDocument();
    });

    it('toggles sentiment filter', async () => {
        const user = userEvent.setup();
        const onSentimentChange = vi.fn();

        render(
            <Filters
                researchId="r1"
                demographicData={mockDemographicData}
                selectedFilters={{}}
                onFilterChange={() => {}}
                sentimentFilter={[]}
                onSentimentFilterChange={onSentimentChange}
            />
        );

        await user.click(screen.getByLabelText('Positive'));

        expect(onSentimentChange).toHaveBeenCalledWith(['positive']);
    });
});
