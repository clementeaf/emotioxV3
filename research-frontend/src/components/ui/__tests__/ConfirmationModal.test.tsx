import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmationModal } from '../ConfirmationModal';

describe('ConfirmationModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        title: 'Delete item?',
        message: 'This action cannot be undone.',
    };

    it('renders nothing when closed', () => {
        render(<ConfirmationModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Delete item?')).not.toBeInTheDocument();
    });

    it('renders title and message when open', () => {
        render(<ConfirmationModal {...defaultProps} />);
        expect(screen.getByText('Delete item?')).toBeInTheDocument();
        expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('renders default button labels', () => {
        render(<ConfirmationModal {...defaultProps} />);
        expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders custom button labels', () => {
        render(<ConfirmationModal {...defaultProps} confirmText="Yes, delete" cancelText="No, keep" />);
        expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'No, keep' })).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button clicked', async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();

        render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} />);
        await user.click(screen.getByRole('button', { name: 'Confirm' }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<ConfirmationModal {...defaultProps} onClose={onClose} />);
        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('disables buttons when isLoading', () => {
        render(<ConfirmationModal {...defaultProps} isLoading />);

        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });
});
