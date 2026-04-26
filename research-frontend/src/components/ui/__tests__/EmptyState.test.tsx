import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
    it('renders title and description', () => {
        render(<EmptyState title="No data" description="Try again later." />);

        expect(screen.getByText('No data')).toBeInTheDocument();
        expect(screen.getByText('Try again later.')).toBeInTheDocument();
    });

    it('renders icon when provided', () => {
        render(
            <EmptyState
                icon={<span data-testid="empty-icon">X</span>}
                title="Empty"
            />
        );

        expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
    });

    it('renders action when provided', () => {
        render(
            <EmptyState
                title="No items"
                action={<button>Create one</button>}
            />
        );

        expect(screen.getByRole('button', { name: 'Create one' })).toBeInTheDocument();
    });

    it('renders only description without title', () => {
        render(<EmptyState description="Just a message" />);

        expect(screen.getByText('Just a message')).toBeInTheDocument();
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(
            <EmptyState title="Test" className="py-20" />
        );

        expect(container.firstChild).toHaveClass('py-20');
    });
});
