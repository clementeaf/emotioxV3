import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
    it('renders children text', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('calls onClick handler', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();

        render(<Button onClick={onClick}>Click</Button>);
        await user.click(screen.getByRole('button'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is disabled when isLoading is true', () => {
        render(<Button isLoading>Loading</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows loading spinner when isLoading', () => {
        const { container } = render(<Button isLoading>Loading</Button>);
        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('applies primary variant by default', () => {
        render(<Button>Primary</Button>);
        expect(screen.getByRole('button').className).toContain('bg-blue-500');
    });

    it('applies danger variant', () => {
        render(<Button variant="danger">Delete</Button>);
        expect(screen.getByRole('button').className).toContain('bg-red-500');
    });

    it('applies secondary variant', () => {
        render(<Button variant="secondary">Secondary</Button>);
        expect(screen.getByRole('button').className).toContain('bg-gray-100');
    });

    it('applies size sm', () => {
        render(<Button size="sm">Small</Button>);
        expect(screen.getByRole('button').className).toContain('h-8');
    });

    it('applies size lg', () => {
        render(<Button size="lg">Large</Button>);
        expect(screen.getByRole('button').className).toContain('h-12');
    });

    it('forwards ref', () => {
        const ref = vi.fn();
        render(<Button ref={ref}>Ref</Button>);
        expect(ref).toHaveBeenCalled();
    });

    it('applies custom className', () => {
        render(<Button className="my-custom">Custom</Button>);
        expect(screen.getByRole('button').className).toContain('my-custom');
    });
});
