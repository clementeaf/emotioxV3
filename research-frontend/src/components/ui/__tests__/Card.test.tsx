import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../Card';

describe('Card', () => {
    it('renders children', () => {
        render(<Card>Card content</Card>);
        expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(<Card className="p-8">Content</Card>);
        expect(container.firstChild).toHaveClass('p-8');
    });

    it('has base styling', () => {
        const { container } = render(<Card>Content</Card>);
        expect(container.firstChild).toHaveClass('rounded-xl', 'border', 'bg-white');
    });
});

describe('CardHeader', () => {
    it('renders children', () => {
        render(<CardHeader>Header</CardHeader>);
        expect(screen.getByText('Header')).toBeInTheDocument();
    });
});

describe('CardTitle', () => {
    it('renders as h3', () => {
        render(<CardTitle>Title</CardTitle>);
        expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Title');
    });
});

describe('CardContent', () => {
    it('renders children', () => {
        render(<CardContent>Body</CardContent>);
        expect(screen.getByText('Body')).toBeInTheDocument();
    });
});

describe('CardFooter', () => {
    it('renders children', () => {
        render(<CardFooter>Footer</CardFooter>);
        expect(screen.getByText('Footer')).toBeInTheDocument();
    });
});

describe('Card composition', () => {
    it('renders full card structure', () => {
        render(
            <Card>
                <CardHeader>
                    <CardTitle>My Card</CardTitle>
                </CardHeader>
                <CardContent>Some content here</CardContent>
                <CardFooter>Action buttons</CardFooter>
            </Card>
        );

        expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('My Card');
        expect(screen.getByText('Some content here')).toBeInTheDocument();
        expect(screen.getByText('Action buttons')).toBeInTheDocument();
    });
});
