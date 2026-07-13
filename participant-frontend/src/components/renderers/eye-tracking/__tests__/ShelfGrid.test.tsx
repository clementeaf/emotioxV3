import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ShelfGrid } from '../ShelfGrid';

describe('ShelfGrid', () => {
    const urls = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg',
    ];

    it('renders the correct number of cells (shelfCount × shelfItems)', () => {
        const { container } = render(
            <ShelfGrid urls={urls} shelfCount={2} shelfItems={3} />
        );
        const images = container.querySelectorAll('img');
        expect(images.length).toBe(6); // 2×3
    });

    it('maps URLs by column — same image repeats across rows', () => {
        const { container } = render(
            <ShelfGrid urls={urls} shelfCount={3} shelfItems={3} />
        );
        const images = container.querySelectorAll('img');
        expect(images.length).toBe(9); // 3×3

        // Row 0: col0=url[0], col1=url[1], col2=url[2]
        expect(images[0].getAttribute('src')).toBe(urls[0]);
        expect(images[1].getAttribute('src')).toBe(urls[1]);
        expect(images[2].getAttribute('src')).toBe(urls[2]);
        // Row 1: same columns repeat
        expect(images[3].getAttribute('src')).toBe(urls[0]);
        expect(images[4].getAttribute('src')).toBe(urls[1]);
        expect(images[5].getAttribute('src')).toBe(urls[2]);
        // Row 2: same
        expect(images[6].getAttribute('src')).toBe(urls[0]);
    });

    it('cycles columns when fewer urls than shelfItems', () => {
        const twoUrls = ['https://example.com/a.jpg', 'https://example.com/b.jpg'];
        const { container } = render(
            <ShelfGrid urls={twoUrls} shelfCount={2} shelfItems={3} />
        );
        const images = container.querySelectorAll('img');
        expect(images.length).toBe(6); // 2×3

        // Sequential cycling: i % urls.length
        // Row 0: i=0→a, i=1→b, i=2→a
        expect(images[0].getAttribute('src')).toBe(twoUrls[0]);
        expect(images[1].getAttribute('src')).toBe(twoUrls[1]);
        expect(images[2].getAttribute('src')).toBe(twoUrls[0]);
        // Row 1: i=3→b, i=4→a, i=5→b
        expect(images[3].getAttribute('src')).toBe(twoUrls[1]);
        expect(images[4].getAttribute('src')).toBe(twoUrls[0]);
        expect(images[5].getAttribute('src')).toBe(twoUrls[1]);
    });

    it('renders nothing when urls is empty', () => {
        const { container } = render(
            <ShelfGrid urls={[]} shelfCount={2} shelfItems={3} />
        );
        expect(container.innerHTML).toBe('');
    });

    it('applies CSS grid with correct columns and rows', () => {
        const { container } = render(
            <ShelfGrid urls={urls} shelfCount={3} shelfItems={4} />
        );
        const grid = container.firstElementChild as HTMLElement;
        expect(grid.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
        expect(grid.style.gridTemplateRows).toBe('repeat(3, 1fr)');
    });

    it('applies blur and opacity when specified', () => {
        const { container } = render(
            <ShelfGrid urls={urls} shelfCount={2} shelfItems={2} blur opacity={0.6} />
        );
        const grid = container.firstElementChild as HTMLElement;
        expect(grid.style.filter).toBe('blur(12px)');
        expect(grid.style.opacity).toBe('0.6');
    });

    it('does not apply blur/opacity by default', () => {
        const { container } = render(
            <ShelfGrid urls={urls} shelfCount={2} shelfItems={2} />
        );
        const grid = container.firstElementChild as HTMLElement;
        expect(grid.style.filter).toBe('');
        expect(grid.style.opacity).toBe('');
    });

    it('forwards containerRef to the grid div', () => {
        const ref = React.createRef<HTMLDivElement>();
        render(
            <ShelfGrid urls={urls} shelfCount={2} shelfItems={2} containerRef={ref} />
        );
        expect(ref.current).not.toBeNull();
        expect(ref.current?.tagName).toBe('DIV');
    });

    it('calls onAllLoaded after all images fire onLoad', () => {
        const onAllLoaded = vi.fn();
        const { container } = render(
            <ShelfGrid urls={urls} shelfCount={1} shelfItems={3} onAllLoaded={onAllLoaded} />
        );
        const images = container.querySelectorAll('img');

        // Fire onload for each image
        images.forEach((img) => {
            img.dispatchEvent(new Event('load'));
        });

        expect(onAllLoaded).toHaveBeenCalledTimes(1);
    });

    it('does not call onAllLoaded before all images load', () => {
        const onAllLoaded = vi.fn();
        const { container } = render(
            <ShelfGrid urls={urls} shelfCount={1} shelfItems={3} onAllLoaded={onAllLoaded} />
        );
        const images = container.querySelectorAll('img');

        // Fire onload for only 2 of 3 images
        images[0].dispatchEvent(new Event('load'));
        images[1].dispatchEvent(new Event('load'));

        expect(onAllLoaded).not.toHaveBeenCalled();
    });

    it('sets draggable=false on all images', () => {
        const { container } = render(
            <ShelfGrid urls={urls} shelfCount={1} shelfItems={2} />
        );
        const images = container.querySelectorAll('img');
        images.forEach((img) => {
            expect(img.getAttribute('draggable')).toBe('false');
        });
    });
});
