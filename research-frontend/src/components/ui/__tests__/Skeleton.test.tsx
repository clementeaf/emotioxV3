import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, ResearchCardSkeleton } from '../Skeleton';

describe('Skeleton', () => {
    it('renders with pulse animation', () => {
        const { container } = render(<Skeleton />);
        expect(container.firstChild).toHaveClass('animate-pulse');
    });

    it('applies custom className', () => {
        const { container } = render(<Skeleton className="h-8 w-48" />);
        expect(container.firstChild).toHaveClass('h-8', 'w-48');
    });

    it('has base gray background', () => {
        const { container } = render(<Skeleton />);
        expect(container.firstChild).toHaveClass('bg-gray-200');
    });
});

describe('ResearchCardSkeleton', () => {
    it('renders without error', () => {
        const { container } = render(<ResearchCardSkeleton />);
        expect(container.firstChild).toBeInTheDocument();
    });

    it('contains multiple skeleton blocks', () => {
        const { container } = render(<ResearchCardSkeleton />);
        const pulses = container.querySelectorAll('.animate-pulse');
        expect(pulses.length).toBeGreaterThan(1);
    });
});
