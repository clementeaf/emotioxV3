import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface StepperProps {
    currentStep: number;
    totalSteps: number;
    steps: Array<{ label: string; description?: string }>;
    children: ReactNode;
    onStepChange?: (step: number) => void;
    className?: string;
}

/**
 * Stepper component for multi-step forms
 * @param currentStep - Current active step (0-indexed)
 * @param totalSteps - Total number of steps
 * @param steps - Array of step labels and descriptions
 * @param children - Step content
 * @param onStepChange - Optional callback when step changes
 * @param className - Additional CSS classes
 */
export const Stepper = ({
    currentStep,
    steps,
    children,
    onStepChange,
    className,
}: StepperProps) => {
    return (
        <div className={cn('w-full', className)}>
            <div className="mb-8">
                <nav aria-label="Progress">
                    <ol className="flex items-center w-3/4">
                        {steps.map((step, index) => {
                            const isActive = index === currentStep;
                            const isCompleted = index < currentStep;
                            const isUpcoming = index > currentStep;

                            return (
                                <li key={index} className="relative flex-1">
                                    {index !== steps.length - 1 && (
                                        <div
                                            className={cn(
                                                'absolute left-5 top-5 h-0.5',
                                                isCompleted ? 'bg-blue-500' : 'bg-gray-300'
                                            )}
                                            style={{ width: 'calc(100% - 2.5rem)', right: 0 }}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <div className="relative flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => onStepChange && onStepChange(index)}
                                            className={cn(
                                                'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                                                isCompleted &&
                                                    'border-blue-500 bg-blue-500 text-white hover:bg-blue-600',
                                                isActive &&
                                                    'border-blue-500 bg-white text-blue-500 ring-4 ring-blue-200',
                                                isUpcoming &&
                                                    'border-gray-300 bg-white text-gray-400 hover:border-gray-400'
                                            )}
                                            disabled={!onStepChange || isUpcoming}
                                        >
                                            {isCompleted ? (
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
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            ) : (
                                                <span className="text-sm font-semibold">{index + 1}</span>
                                            )}
                                        </button>
                                        <div className="ml-4 min-w-0">
                                            <p
                                                className={cn(
                                                    'text-sm font-medium',
                                                    isActive && 'text-blue-600',
                                                    isCompleted && 'text-blue-600',
                                                    isUpcoming && 'text-gray-500'
                                                )}
                                            >
                                                {step.label}
                                            </p>
                                            {step.description && (
                                                <p className="text-sm text-gray-500">{step.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            </div>
            <div>{children}</div>
        </div>
    );
};

