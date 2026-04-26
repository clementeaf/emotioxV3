import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SearchInput } from '../SearchInput';

describe('SearchInput', () => {
    it('renders with placeholder', () => {
        render(<SearchInput value="" onChange={() => {}} placeholder="Search users..." />);
        expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    });

    it('renders default placeholder', () => {
        render(<SearchInput value="" onChange={() => {}} />);
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('displays current value', () => {
        render(<SearchInput value="hello" onChange={() => {}} />);
        expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    });

    it('calls onChange with new value', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<SearchInput value="" onChange={onChange} />);
        await user.type(screen.getByRole('textbox'), 'test');

        expect(onChange).toHaveBeenCalledWith('t');
    });

    it('shows clear button when value is non-empty', () => {
        render(<SearchInput value="abc" onChange={() => {}} />);
        // X button exists
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBe(1);
    });

    it('does not show clear button when value is empty', () => {
        render(<SearchInput value="" onChange={() => {}} />);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('clears value when clear button clicked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<SearchInput value="test" onChange={onChange} />);
        await user.click(screen.getByRole('button'));

        expect(onChange).toHaveBeenCalledWith('');
    });
});
