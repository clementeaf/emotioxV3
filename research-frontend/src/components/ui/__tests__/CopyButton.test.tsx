import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CopyButton } from '../CopyButton';

const writeTextMock = vi.fn().mockResolvedValue(undefined);

describe('CopyButton', () => {
    beforeEach(() => {
        writeTextMock.mockClear();
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: writeTextMock },
            writable: true,
            configurable: true,
        });
    });

    it('renders without label (icon-only)', () => {
        render(<CopyButton text="hello" />);

        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('title', 'Copy to clipboard');
    });

    it('renders with label', () => {
        render(<CopyButton text="hello" label="Copy code" />);

        expect(screen.getByText('Copy code')).toBeInTheDocument();
    });

    it('shows copied feedback after click', async () => {
        const user = userEvent.setup();

        render(<CopyButton text="hello" label="Copy" />);

        expect(screen.getByText('Copy')).toBeInTheDocument();

        await user.click(screen.getByRole('button'));

        expect(screen.getByText('Copied!')).toBeInTheDocument();
        expect(screen.getByRole('button')).toHaveAttribute('title', 'Copied!');
    });
});
