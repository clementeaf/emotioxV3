import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '../Badge';

describe('Badge', () => {
    it('renders children', () => {
        render(<Badge>Active</Badge>);
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('applies default variant styling', () => {
        render(<Badge>Default</Badge>);
        expect(screen.getByText('Default').className).toContain('bg-gray-100');
    });

    it('applies success variant', () => {
        render(<Badge variant="success">Done</Badge>);
        expect(screen.getByText('Done').className).toContain('bg-green-100');
    });

    it('applies warning variant', () => {
        render(<Badge variant="warning">Pending</Badge>);
        expect(screen.getByText('Pending').className).toContain('bg-yellow-100');
    });

    it('applies danger variant', () => {
        render(<Badge variant="danger">Error</Badge>);
        expect(screen.getByText('Error').className).toContain('bg-red-100');
    });

    it('applies custom className', () => {
        render(<Badge className="ml-2">Custom</Badge>);
        expect(screen.getByText('Custom').className).toContain('ml-2');
    });

    it('has rounded-full class for pill shape', () => {
        render(<Badge>Pill</Badge>);
        expect(screen.getByText('Pill').className).toContain('rounded-full');
    });
});
