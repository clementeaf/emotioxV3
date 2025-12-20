import React from 'react';
import { TurnstileWidget } from '../security/TurnstileWidget';
import { useSessionStore } from '../../stores/useSessionStore';

interface WelcomeStepProps {
    title?: string;
    message?: string;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({
    title = 'Bienvenido a la Investigación',
    message = 'Gracias por participar en este estudio. A continuación, responderás una serie de preguntas que nos ayudarán a comprender mejor tu experiencia.'
}) => {
    const { setTurnstileToken, turnstileVerified } = useSessionStore();

    const handleTurnstileSuccess = (token: string) => {
        console.log('[WelcomeStep] Turnstile verification successful');
        setTurnstileToken(token);
    };

    const handleTurnstileError = (error: Error) => {
        console.error('[WelcomeStep] Turnstile verification failed:', error);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 px-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                    />
                </svg>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
                {title}
            </h1>

            <p className="text-lg text-gray-600 max-w-2xl">
                {message}
            </p>

            {/* Anti-bot verification */}
            <div className="mt-6">
                <TurnstileWidget
                    onSuccess={handleTurnstileSuccess}
                    onError={handleTurnstileError}
                />
            </div>

            {turnstileVerified && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verificación completada
                </div>
            )}
        </div>
    );
};
