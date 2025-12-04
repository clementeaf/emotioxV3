import React from 'react';

interface ThankYouStepProps {
    title?: string;
    message?: string;
}

export const ThankYouStep: React.FC<ThankYouStepProps> = ({
    title = '¡Gracias por tu Participación!',
    message = 'Hemos recibido tus respuestas correctamente. Tu contribución es muy valiosa para nuestra investigación.'
}) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 px-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
                {title}
            </h1>

            <p className="text-lg text-gray-600 max-w-2xl">
                {message}
            </p>
        </div>
    );
};
