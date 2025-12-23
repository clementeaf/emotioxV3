import { type ReactNode, createContext, useContext, useState } from 'react';
import { cn } from '../../lib/utils';

interface TabsContextValue {
    value: string;
    onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

const useTabsContext = (): TabsContextValue => {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs components must be used within a Tabs provider');
    }
    return context;
};

interface TabsProps {
    defaultValue: string;
    value?: string;
    onValueChange?: (value: string) => void;
    className?: string;
    children: ReactNode;
}

/**
 * Componente Tabs principal
 * @param defaultValue - Valor por defecto de la pestaña activa
 * @param value - Valor controlado de la pestaña activa
 * @param onValueChange - Callback cuando cambia la pestaña activa
 * @param className - Clases CSS adicionales
 * @param children - Contenido de las pestañas
 */
export function Tabs({ defaultValue, value: controlledValue, onValueChange, className, children }: TabsProps) {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const value = controlledValue ?? internalValue;

    const handleValueChange = (newValue: string): void => {
        if (controlledValue === undefined) {
            setInternalValue(newValue);
        }
        onValueChange?.(newValue);
    };

    return (
        <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
            <div className={cn('w-full', className)}>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

interface TabsListProps {
    className?: string;
    children: ReactNode;
}

/**
 * Lista de pestañas
 * @param className - Clases CSS adicionales
 * @param children - TabsTrigger components
 */
export function TabsList({ className, children }: TabsListProps) {
    return (
        <div
            className={cn(
                'inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500',
                className
            )}
        >
            {children}
        </div>
    );
}

interface TabsTriggerProps {
    value: string;
    className?: string;
    children: ReactNode;
}

/**
 * Trigger individual de una pestaña
 * @param value - Valor único de la pestaña
 * @param className - Clases CSS adicionales
 * @param children - Contenido del trigger
 */
export function TabsTrigger({ value, className, children }: TabsTriggerProps) {
    const { value: activeValue, onValueChange } = useTabsContext();
    const isActive = activeValue === value;

    return (
        <button
            type="button"
            onClick={() => onValueChange(value)}
            className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                isActive
                    ? 'bg-white text-gray-950 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900',
                className
            )}
        >
            {children}
        </button>
    );
}

interface TabsContentProps {
    value: string;
    className?: string;
    children: ReactNode;
}

/**
 * Contenido de una pestaña
 * @param value - Valor único de la pestaña
 * @param className - Clases CSS adicionales
 * @param children - Contenido a mostrar cuando la pestaña está activa
 */
export function TabsContent({ value, className, children }: TabsContentProps) {
    const { value: activeValue } = useTabsContext();
    const isActive = activeValue === value;

    if (!isActive) {
        return null;
    }

    return (
        <div
            className={cn(
                'mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                className
            )}
        >
            {children}
        </div>
    );
}

