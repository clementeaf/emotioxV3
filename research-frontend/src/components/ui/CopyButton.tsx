import { type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

interface CopyButtonProps {
    /** Text to copy */
    text: string;
    /** Button label (default: none, icon-only) */
    label?: string;
    /** Custom icon when not copied (default: Copy) */
    icon?: ReactNode;
    /** Size variant */
    size?: 'sm' | 'md';
    /** Extra className */
    className?: string;
}

export const CopyButton = ({ text, label, icon, size = 'md', className }: CopyButtonProps) => {
    const [copied, copy] = useCopyToClipboard();

    const sizeClasses = size === 'sm' ? 'p-1.5' : 'p-2';
    const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

    return (
        <button
            onClick={() => copy(text)}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-md transition-colors',
                label
                    ? 'px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200'
                    : `${sizeClasses} text-gray-400 hover:text-gray-600 hover:bg-gray-100`,
                className,
            )}
            title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
            {copied ? (
                <Check className={cn(iconSize, 'text-green-500')} />
            ) : (
                icon || <Copy className={iconSize} />
            )}
            {label && <span>{copied ? 'Copied!' : label}</span>}
        </button>
    );
};
