import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DataTable, type DataTableColumn } from '../DataTable';

type TestRow = { id: string; name: string; age: number; email: string };

const testData: TestRow[] = [
    { id: '1', name: 'Alice', age: 30, email: 'alice@test.com' },
    { id: '2', name: 'Bob', age: 25, email: 'bob@test.com' },
    { id: '3', name: 'Charlie', age: 35, email: 'charlie@test.com' },
];

const columns: DataTableColumn<TestRow>[] = [
    { key: 'name', header: 'Name', accessor: 'name' },
    { key: 'age', header: 'Age', accessor: 'age', align: 'right', sortable: true },
    { key: 'email', header: 'Email', accessor: 'email' },
];

describe('DataTable', () => {
    it('renders headers and rows', () => {
        render(
            <DataTable columns={columns} data={testData} rowKey={(r) => r.id} />
        );

        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Age')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Charlie')).toBeInTheDocument();
        expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('shows empty message when no data', () => {
        render(
            <DataTable columns={columns} data={[]} rowKey={(r) => r.id} emptyMessage="Nothing here" />
        );

        expect(screen.getByText('Nothing here')).toBeInTheDocument();
    });

    it('shows default empty message', () => {
        render(
            <DataTable columns={columns} data={[]} rowKey={(r) => r.id} />
        );

        expect(screen.getByText('No data available.')).toBeInTheDocument();
    });

    it('calls onRowClick when row is clicked', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();

        render(
            <DataTable columns={columns} data={testData} rowKey={(r) => r.id} onRowClick={onClick} />
        );

        await user.click(screen.getByText('Alice'));
        expect(onClick).toHaveBeenCalledWith(testData[0], 0);
    });

    it('sorts by sortable column', async () => {
        const user = userEvent.setup();

        render(
            <DataTable columns={columns} data={testData} rowKey={(r) => r.id} />
        );

        // Click Age header to sort ascending
        await user.click(screen.getByText('Age'));

        const rows = screen.getAllByRole('row');
        // rows[0] is header, rows[1..3] are data
        expect(within(rows[1]).getByText('25')).toBeInTheDocument(); // Bob first (ascending)
        expect(within(rows[2]).getByText('30')).toBeInTheDocument(); // Alice
        expect(within(rows[3]).getByText('35')).toBeInTheDocument(); // Charlie

        // Click again to sort descending
        await user.click(screen.getByText('Age'));

        const rows2 = screen.getAllByRole('row');
        expect(within(rows2[1]).getByText('35')).toBeInTheDocument(); // Charlie first (descending)
    });

    it('renders custom cell with render prop', () => {
        const customColumns: DataTableColumn<TestRow>[] = [
            {
                key: 'name',
                header: 'Name',
                render: (row) => <span data-testid="custom">{row.name.toUpperCase()}</span>,
            },
        ];

        render(
            <DataTable columns={customColumns} data={testData} rowKey={(r) => r.id} />
        );

        expect(screen.getByText('ALICE')).toBeInTheDocument();
        expect(screen.getAllByTestId('custom')).toHaveLength(3);
    });

    it('renders compact size variant', () => {
        const { container } = render(
            <DataTable columns={columns} data={testData} rowKey={(r) => r.id} size="compact" />
        );

        const table = container.querySelector('table');
        expect(table?.className).toContain('text-xs');
    });

    it('renders custom header with headerRender', () => {
        const customColumns: DataTableColumn<TestRow>[] = [
            {
                key: 'name',
                header: 'Name',
                headerRender: () => <span data-testid="custom-header">Custom Header</span>,
                accessor: 'name',
            },
        ];

        render(
            <DataTable columns={customColumns} data={testData} rowKey={(r) => r.id} />
        );

        expect(screen.getByTestId('custom-header')).toBeInTheDocument();
        expect(screen.getByText('Custom Header')).toBeInTheDocument();
    });
});
