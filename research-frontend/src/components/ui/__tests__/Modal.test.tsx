import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '../Modal';

describe('Modal', () => {
    it('renders nothing when closed', () => {
        render(<Modal isOpen={false} onClose={() => {}}>Content</Modal>);
        expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('renders content when open', () => {
        render(<Modal isOpen={true} onClose={() => {}}>Modal body</Modal>);
        expect(screen.getByText('Modal body')).toBeInTheDocument();
    });

    it('renders title', () => {
        render(<Modal isOpen={true} onClose={() => {}} title="My Modal">Body</Modal>);
        expect(screen.getByText('My Modal')).toBeInTheDocument();
    });

    it('renders footer', () => {
        render(
            <Modal isOpen={true} onClose={() => {}} footer={<button>Save</button>}>
                Body
            </Modal>
        );
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('has dialog role', () => {
        render(<Modal isOpen={true} onClose={() => {}}>Body</Modal>);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes on Escape key', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<Modal isOpen={true} onClose={onClose}>Body</Modal>);
        await user.keyboard('{Escape}');

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on Escape when closeOnEscape is false', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<Modal isOpen={true} onClose={onClose} closeOnEscape={false}>Body</Modal>);
        await user.keyboard('{Escape}');

        expect(onClose).not.toHaveBeenCalled();
    });

    it('closes on overlay click', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<Modal isOpen={true} onClose={onClose}>Body</Modal>);

        const overlay = screen.getByRole('dialog');
        await user.click(overlay);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on content click', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<Modal isOpen={true} onClose={onClose}>Body text</Modal>);
        await user.click(screen.getByText('Body text'));

        expect(onClose).not.toHaveBeenCalled();
    });

    it('renders close button', () => {
        render(<Modal isOpen={true} onClose={() => {}}>Body</Modal>);
        expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });
});
