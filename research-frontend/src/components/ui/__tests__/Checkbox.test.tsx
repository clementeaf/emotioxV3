import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
    it('renders checkbox input', () => {
        render(<Checkbox />);
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders label', () => {
        render(<Checkbox label="Accept terms" />);
        expect(screen.getByText('Accept terms')).toBeInTheDocument();
    });

    it('renders description', () => {
        render(<Checkbox label="Terms" description="Read carefully" />);
        expect(screen.getByText('Read carefully')).toBeInTheDocument();
    });

    it('associates label with checkbox', () => {
        render(<Checkbox label="Agree" id="agree-cb" />);
        const label = screen.getByText('Agree');
        expect(label).toHaveAttribute('for', 'agree-cb');
    });

    it('reflects checked state', () => {
        render(<Checkbox checked onChange={() => {}} />);
        expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('calls onChange when clicked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<Checkbox onChange={onChange} />);
        await user.click(screen.getByRole('checkbox'));

        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('shows error message', () => {
        render(<Checkbox error="Must accept" />);
        expect(screen.getByText('Must accept')).toBeInTheDocument();
    });

    it('is disabled when disabled prop set', () => {
        render(<Checkbox disabled />);
        expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('applies custom className', () => {
        render(<Checkbox className="border-red-500" />);
        expect(screen.getByRole('checkbox').className).toContain('border-red-500');
    });
});
