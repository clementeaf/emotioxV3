import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

type DrawerSide = 'left' | 'right';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    side?: DrawerSide;
    width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    className?: string;
}

const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl',
};

export const Drawer = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    side = 'right',
    width = 'md',
    closeOnOverlayClick = true,
    closeOnEscape = true,
    className,
}: DrawerProps) => {
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;
        const handleEscape = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, onClose]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClick = (): void => {
        if (closeOnOverlayClick) onClose();
    };

    const content = (
        <div
            className="fixed inset-0 z-50 flex"
            style={{ zIndex: 9999 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'drawer-title' : undefined}
        >
            {/* Overlay — click to close */}
            <div
                className="absolute inset-0 bg-black/40 transition-opacity"
                onClick={handleOverlayClick}
            />

            {/* Panel */}
            <div
                className={cn(
                    'relative ml-auto flex h-full w-full flex-col bg-white shadow-xl',
                    widthClasses[width],
                    side === 'left' && 'ml-0 mr-auto',
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {(title || closeOnOverlayClick) && (
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                        {title && (
                            <h2 id="drawer-title" className="text-lg font-semibold text-gray-900">
                                {title}
                            </h2>
                        )}
                        <button
                            onClick={onClose}
                            className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Close drawer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(content, document.body);
};
