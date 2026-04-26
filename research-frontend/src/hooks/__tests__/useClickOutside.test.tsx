import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { useClickOutside } from '../useClickOutside';

const TestComponent = ({ onClickOutside, enabled = true }: { onClickOutside: () => void; enabled?: boolean }) => {
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, onClickOutside, enabled);

    return (
        <div>
            <div ref={ref} data-testid="inside">Inside</div>
            <div data-testid="outside">Outside</div>
        </div>
    );
};

describe('useClickOutside', () => {
    it('calls handler when clicking outside', async () => {
        const user = userEvent.setup();
        const handler = vi.fn();

        render(<TestComponent onClickOutside={handler} />);

        await user.click(screen.getByTestId('outside'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not call handler when clicking inside', async () => {
        const user = userEvent.setup();
        const handler = vi.fn();

        render(<TestComponent onClickOutside={handler} />);

        await user.click(screen.getByTestId('inside'));
        expect(handler).not.toHaveBeenCalled();
    });

    it('does not call handler when disabled', async () => {
        const user = userEvent.setup();
        const handler = vi.fn();

        render(<TestComponent onClickOutside={handler} enabled={false} />);

        await user.click(screen.getByTestId('outside'));
        expect(handler).not.toHaveBeenCalled();
    });
});
