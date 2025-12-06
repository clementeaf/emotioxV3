import { useState, useEffect } from 'react';
import { useResponse } from '../../hooks/useResponse';

interface TextQuestionProps {
    moduleId: string;
    componentId: string;
    title?: string;
    description?: string;
    placeholder?: string;
    isLongText?: boolean;
    required?: boolean;
}

export const TextQuestion = ({
    moduleId,
    componentId,
    title,
    description,
    placeholder = 'Escribe tu respuesta...',
    isLongText = false,
    required = false,
}: TextQuestionProps) => {
    const [text, setText] = useState('');
    const { save } = useResponse({ moduleId, componentId });

    useEffect(() => {
        // Auto-save on text change (debounced by user typing)
        if (text.trim()) {
            save(text, { length: text.length });
        }
    }, [text, save]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setText(e.target.value);
    };

    return (
        <div className="w-full space-y-4">
            {title && (
                <h2 className="text-xl font-semibold text-gray-900">
                    {title}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </h2>
            )}

            {description && (
                <p className="text-gray-600">{description}</p>
            )}

            {isLongText ? (
                <textarea
                    value={text}
                    onChange={handleChange}
                    placeholder={placeholder}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
            ) : (
                <input
                    type="text"
                    value={text}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
            )}

            {text.length > 0 && (
                <p className="text-sm text-gray-500">
                    {text.length} caracteres
                </p>
            )}
        </div>
    );
};
