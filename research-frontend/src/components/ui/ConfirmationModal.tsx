import { Button } from './Button';
import { Modal } from './Modal';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false,
}: ConfirmationModalProps) => {
    const getIcon = () => {
        switch (variant) {
            case 'danger':
                return <AlertCircle className="h-6 w-6 text-red-600" />;
            case 'warning':
                return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
            case 'info':
                return <Info className="h-6 w-6 text-blue-600" />;
        }
    };

    const getButtonVariant = () => {
        switch (variant) {
            case 'danger':
                return 'danger';
            case 'warning':
                return 'secondary'; // Or add a warning variant to Button if needed
            case 'info':
                return 'primary';
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                        {cancelText}
                    </Button>
                    <Button
                        variant={getButtonVariant() as any}
                        onClick={onConfirm}
                        isLoading={isLoading}
                        disabled={isLoading}
                    >
                        {confirmText}
                    </Button>
                </div>
            }
        >
            <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 rounded-full p-2 ${variant === 'danger' ? 'bg-red-100' :
                        variant === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                    {getIcon()}
                </div>
                <div className="mt-1">
                    <p className="text-sm text-gray-500">
                        {message}
                    </p>
                </div>
            </div>
        </Modal>
    );
};
