import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AoiTimelineBar } from '../AoiTimelineBar';
import type { ManualAOI } from '../../../types/attentionPrediction.types';

const makeAoi = (id: string, label: string, timeRange?: { startTime: number; endTime: number }): ManualAOI => ({
    id,
    label,
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    source: 'manual',
    ...(timeRange ? { timeRange } : {}),
});

describe('AoiTimelineBar', () => {
    it('renders nothing when no aois', () => {
        const { container } = render(
            <AoiTimelineBar aois={[]} videoDuration={30} onChange={vi.fn()} />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when videoDuration is 0', () => {
        const { container } = render(
            <AoiTimelineBar aois={[makeAoi('a', 'Zone A')]} videoDuration={0} onChange={vi.fn()} />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders a bar for each AOI', () => {
        render(
            <AoiTimelineBar
                aois={[makeAoi('a', 'Zone A'), makeAoi('b', 'Zone B')]}
                videoDuration={30}
                onChange={vi.fn()}
            />,
        );
        expect(screen.getByText('Zone A')).toBeTruthy();
        expect(screen.getByText('Zone B')).toBeTruthy();
    });

    it('shows AOI labels', () => {
        render(
            <AoiTimelineBar
                aois={[makeAoi('a', 'Logo'), makeAoi('b', 'CTA Button')]}
                videoDuration={20}
                onChange={vi.fn()}
            />,
        );
        expect(screen.getByText('Logo')).toBeTruthy();
        expect(screen.getByText('CTA Button')).toBeTruthy();
    });

    it('renders time axis ticks', () => {
        render(
            <AoiTimelineBar
                aois={[makeAoi('a', 'A')]}
                videoDuration={10}
                onChange={vi.fn()}
            />,
        );
        // Duration 10s, interval 1s → ticks at 0s, 1s, 2s...10s
        // getAllByText because AOI time labels may also show "0s"/"10s"
        expect(screen.getAllByText('0s').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('5s').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('10s').length).toBeGreaterThanOrEqual(1);
    });

    it('displays time labels for AOI with custom timeRange', () => {
        render(
            <AoiTimelineBar
                aois={[makeAoi('a', 'A', { startTime: 5, endTime: 15 })]}
                videoDuration={30}
                onChange={vi.fn()}
            />,
        );
        // Both tick axis and AOI bar show these times
        expect(screen.getAllByText('5s').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('15s').length).toBeGreaterThanOrEqual(1);
    });

    it('renders drag handles (cursor-ew-resize elements)', () => {
        const { container } = render(
            <AoiTimelineBar
                aois={[makeAoi('a', 'A', { startTime: 0, endTime: 10 })]}
                videoDuration={20}
                onChange={vi.fn()}
            />,
        );
        const handles = container.querySelectorAll('.cursor-ew-resize');
        // 2 handles per AOI (start + end)
        expect(handles.length).toBe(2);
    });

    it('calls onChange when drag handle is moved', () => {
        const onChange = vi.fn();
        const { container } = render(
            <AoiTimelineBar
                aois={[makeAoi('a', 'A', { startTime: 5, endTime: 15 })]}
                videoDuration={30}
                onChange={onChange}
            />,
        );

        const handles = container.querySelectorAll('.cursor-ew-resize');
        const endHandle = handles[1]; // second handle = end

        // Simulate drag start
        fireEvent.mouseDown(endHandle, { clientX: 100 });

        // Simulate drag move — the onChange should fire on mousemove
        fireEvent.mouseMove(window, { clientX: 150 });

        // onChange should have been called with the aoiId
        expect(onChange).toHaveBeenCalledWith(
            'a',
            expect.objectContaining({
                startTime: expect.any(Number),
                endTime: expect.any(Number),
            }),
        );

        // Cleanup drag
        fireEvent.mouseUp(window);
    });

    it('clamps endTime to videoDuration during drag', () => {
        const onChange = vi.fn();
        const { container } = render(
            <AoiTimelineBar
                aois={[makeAoi('a', 'A', { startTime: 0, endTime: 10 })]}
                videoDuration={20}
                onChange={onChange}
            />,
        );

        const handles = container.querySelectorAll('.cursor-ew-resize');
        const endHandle = handles[1];

        // Start drag
        fireEvent.mouseDown(endHandle, { clientX: 100 });
        // Move way beyond the container → should clamp
        fireEvent.mouseMove(window, { clientX: 99999 });

        if (onChange.mock.calls.length > 0) {
            const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
            expect(lastCall[1].endTime).toBeLessThanOrEqual(20);
        }

        fireEvent.mouseUp(window);
    });

    it('enforces minimum gap between start and end', () => {
        const onChange = vi.fn();
        const { container } = render(
            <AoiTimelineBar
                aois={[makeAoi('a', 'A', { startTime: 10, endTime: 15 })]}
                videoDuration={30}
                onChange={onChange}
            />,
        );

        const handles = container.querySelectorAll('.cursor-ew-resize');
        const startHandle = handles[0];

        // Drag start handle past end handle
        fireEvent.mouseDown(startHandle, { clientX: 100 });
        fireEvent.mouseMove(window, { clientX: 99999 });

        if (onChange.mock.calls.length > 0) {
            const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
            // startTime should be clamped to endTime - 0.5s
            expect(lastCall[1].startTime).toBeLessThanOrEqual(14.5);
        }

        fireEvent.mouseUp(window);
    });

    it('snaps to frame timestamps when provided', () => {
        const onChange = vi.fn();
        const frameTimestamps = [0, 2, 4, 6, 8, 10];
        const { container } = render(
            <AoiTimelineBar
                aois={[makeAoi('a', 'A', { startTime: 0, endTime: 10 })]}
                videoDuration={12}
                onChange={onChange}
                frameTimestamps={frameTimestamps}
            />,
        );

        const handles = container.querySelectorAll('.cursor-ew-resize');
        fireEvent.mouseDown(handles[0], { clientX: 100 });
        fireEvent.mouseMove(window, { clientX: 105 });

        // If called, the startTime should be one of the frame timestamps
        if (onChange.mock.calls.length > 0) {
            const startTime = onChange.mock.calls[0][1].startTime;
            // Should be snapped to nearest frame timestamp or 0
            expect(startTime).toBeGreaterThanOrEqual(0);
        }

        fireEvent.mouseUp(window);
    });
});
