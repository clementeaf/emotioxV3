import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Toggle } from '../Toggle';

describe('Toggle', () => {
    it('renders with label', () => {
        render(<Toggle label="Dark mode" checked={false} onChange={() => {}} />);
        expect(screen.getByText('Dark mode')).toBeInTheDocument();
    });

    it('renders description', () => {
        render(<Toggle label="Notify" description="Send email notifications" checked={false} onChange={() => {}} />);
        expect(screen.getByText('Send email notifications')).toBeInTheDocument();
    });

    it('renders checkbox input', () => {
        render(<Toggle checked={false} onChange={() => {}} />);
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('reflects checked state', () => {
        render(<Toggle checked={true} onChange={() => {}} />);
        expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('reflects unchecked state', () => {
        render(<Toggle checked={false} onChange={() => {}} />);
        expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('calls onChange when toggle track is clicked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<Toggle label="Toggle me" checked={false} onChange={onChange} />);

        // Click the label text to trigger toggle
        await user.click(screen.getByText('Toggle me'));

        expect(onChange).toHaveBeenCalled();
    });

    it('shows error message', () => {
        render(<Toggle error="Required" checked={false} onChange={() => {}} />);
        expect(screen.getByText('Required')).toBeInTheDocument();
    });

    it('is disabled when disabled prop set', () => {
        render(<Toggle disabled checked={false} onChange={() => {}} />);
        expect(screen.getByRole('checkbox')).toBeDisabled();
    });
});
