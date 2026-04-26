import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../Tabs';

const renderTabs = (props?: { defaultValue?: string; onValueChange?: (v: string) => void }) => {
    return render(
        <Tabs defaultValue={props?.defaultValue || 'tab1'} onValueChange={props?.onValueChange}>
            <TabsList>
                <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                <TabsTrigger value="tab3">Tab 3</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">Content 1</TabsContent>
            <TabsContent value="tab2">Content 2</TabsContent>
            <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>
    );
};

describe('Tabs', () => {
    it('renders all triggers', () => {
        renderTabs();

        expect(screen.getByText('Tab 1')).toBeInTheDocument();
        expect(screen.getByText('Tab 2')).toBeInTheDocument();
        expect(screen.getByText('Tab 3')).toBeInTheDocument();
    });

    it('shows default tab content', () => {
        renderTabs({ defaultValue: 'tab1' });

        expect(screen.getByText('Content 1')).toBeInTheDocument();
        expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
        expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });

    it('switches content on trigger click', async () => {
        const user = userEvent.setup();
        renderTabs();

        await user.click(screen.getByText('Tab 2'));

        expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
        expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('calls onValueChange callback', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        renderTabs({ onValueChange });

        await user.click(screen.getByText('Tab 3'));

        expect(onValueChange).toHaveBeenCalledWith('tab3');
    });

    it('renders with second tab as default', () => {
        renderTabs({ defaultValue: 'tab2' });

        expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
        expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('throws when TabsTrigger used outside Tabs', () => {
        expect(() => {
            render(<TabsTrigger value="x">Orphan</TabsTrigger>);
        }).toThrow('Tabs components must be used within a Tabs provider');
    });
});
