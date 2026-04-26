import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '../Input';

describe('Input', () => {
    it('renders input element', () => {
        render(<Input placeholder="Type here" />);
        expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
    });

    it('renders label when provided', () => {
        render(<Input label="Email" />);
        expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('associates label with input via htmlFor', () => {
        render(<Input label="Name" id="name-input" />);
        const label = screen.getByText('Name');
        expect(label).toHaveAttribute('for', 'name-input');
    });

    it('shows error message', () => {
        render(<Input error="Required field" />);
        expect(screen.getByText('Required field')).toBeInTheDocument();
    });

    it('applies error styling', () => {
        render(<Input error="Oops" />);
        const input = screen.getByRole('textbox');
        expect(input.className).toContain('border-red');
    });

    it('calls onChange handler', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<Input onChange={onChange} />);
        await user.type(screen.getByRole('textbox'), 'hello');

        expect(onChange).toHaveBeenCalled();
    });

    it('renders inline label variant', () => {
        render(<Input label="Prefix" labelPosition="inline" />);
        const label = screen.getByText('Prefix');
        expect(label).toBeInTheDocument();
    });

    it('is disabled when disabled prop set', () => {
        render(<Input disabled />);
        expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('forwards ref', () => {
        const ref = vi.fn();
        render(<Input ref={ref} />);
        expect(ref).toHaveBeenCalled();
    });
});
