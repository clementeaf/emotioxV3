import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
    it('renders label and value', () => {
        render(<StatCard label="Total Users" value={42} />);

        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders string value', () => {
        render(<StatCard label="Duration" value="3m 45s" />);

        expect(screen.getByText('3m 45s')).toBeInTheDocument();
    });

    it('renders icon when provided', () => {
        render(
            <StatCard
                icon={<span data-testid="icon">I</span>}
                label="Metric"
                value={100}
            />
        );

        expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('renders subtitle when provided', () => {
        render(<StatCard label="Score" value={95} subtitle="out of 100" />);

        expect(screen.getByText('out of 100')).toBeInTheDocument();
    });

    it('renders trend when provided', () => {
        render(
            <StatCard label="Revenue" value="$1.2M" trend={{ value: '+12%', positive: true }} />
        );

        expect(screen.getByText('+12%')).toBeInTheDocument();
    });

    it('renders negative trend', () => {
        render(
            <StatCard label="Churn" value="5%" trend={{ value: '-3%', positive: false }} />
        );

        const trend = screen.getByText('-3%');
        expect(trend).toBeInTheDocument();
        expect(trend.className).toContain('text-red');
    });

    it('does not render subtitle or trend when not provided', () => {
        const { container } = render(<StatCard label="Simple" value={1} />);

        // Only label and value exist
        const texts = container.querySelectorAll('p, span');
        const textContents = Array.from(texts).map(t => t.textContent);
        expect(textContents).not.toContain('undefined');
    });
});
