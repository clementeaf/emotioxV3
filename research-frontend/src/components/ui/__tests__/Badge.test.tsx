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

    it('applies info variant', () => {
        render(<Badge variant="info">Info</Badge>);
        expect(screen.getByText('Info').className).toContain('bg-blue-100');
    });

    it('applies soft blue variant', () => {
        render(<Badge variant="blue">Condition</Badge>);
        expect(screen.getByText('Condition').className).toContain('bg-blue-50');
        expect(screen.getByText('Condition').className).toContain('text-blue-600');
    });

    it('applies soft green variant', () => {
        render(<Badge variant="green">Qualify</Badge>);
        expect(screen.getByText('Qualify').className).toContain('bg-green-50');
    });

    it('applies soft red variant', () => {
        render(<Badge variant="red">Disqualify</Badge>);
        expect(screen.getByText('Disqualify').className).toContain('bg-red-50');
    });

    it('applies custom className', () => {
        render(<Badge className="ml-2">Custom</Badge>);
        expect(screen.getByText('Custom').className).toContain('ml-2');
    });

    it('uses pill shape by default', () => {
        render(<Badge>Pill</Badge>);
        expect(screen.getByText('Pill').className).toContain('rounded-full');
    });

    it('uses square shape when specified', () => {
        render(<Badge shape="square">Square</Badge>);
        const el = screen.getByText('Square');
        expect(el.className).toContain('rounded');
        expect(el.className).not.toContain('rounded-full');
    });

    it('uses sm size', () => {
        render(<Badge size="sm">Tiny</Badge>);
        expect(screen.getByText('Tiny').className).toContain('text-[10px]');
    });

    it('uses default size', () => {
        render(<Badge>Normal</Badge>);
        expect(screen.getByText('Normal').className).toContain('text-xs');
    });
});
