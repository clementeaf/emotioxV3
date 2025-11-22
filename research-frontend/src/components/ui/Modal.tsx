import { type ReactNode, useEffect } from 'react';
import { cn } from '../ui/Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    className?: string;
}

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
};

/**
 * Reusable modal component
 * @param isOpen - Controls modal visibility
 * @param onClose - Callback when modal should close
 * @param title - Optional modal title
 * @param children - Modal content
 * @param footer - Optional footer content
 * @param size - Modal size variant
 * @param closeOnOverlayClick - Whether clicking overlay closes modal
 * @param closeOnEscape - Whether pressing Escape closes modal
 * @param className - Additional CSS classes
 */
export const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeOnOverlayClick = true,
    closeOnEscape = true,
    className,
}: ModalProps) => {
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleEscape = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, closeOnEscape, onClose]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>): void => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="absolute top-0 left-0 right-0 bottom-0 flex h-full items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            <div
                className={cn(
                    'bg-white rounded-lg shadow-xl w-full flex flex-col max-h-[90vh] overflow-hidden',
                    sizeClasses[size],
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {(title || closeOnOverlayClick) && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        {title && (
                            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                                {title}
                            </h2>
                        )}
                        {closeOnOverlayClick && (
                            <button
                                onClick={onClose}
                                className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Close modal"
                            >
                                <svg
                                    className="h-6 w-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

                {footer && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">{footer}</div>
                )}
            </div>
        </div>
    );
};

