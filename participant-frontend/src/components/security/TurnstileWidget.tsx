import { Turnstile } from '@marsidev/react-turnstile';
import { useState } from 'react';

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

/**
 * Cloudflare Turnstile CAPTCHA widget
 * Protects against automated bot submissions
 */
export const TurnstileWidget = ({ onSuccess, onError, className }: TurnstileWidgetProps) => {
  const [isLoading, setIsLoading] = useState(true);

  // Get site key from environment variable
  // For testing, Cloudflare provides: 1x00000000000000000000AA (always passes)
  // For production, get from Cloudflare dashboard
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  const handleSuccess = (token: string) => {
    setIsLoading(false);
    onSuccess(token);
  };

  const handleError = (error: string) => {
    setIsLoading(false);
    console.error('Turnstile error:', error);
    onError?.(new Error(error));
  };

  return (
    <div className={className}>
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="text-sm text-gray-500">Verifying human...</div>
        </div>
      )}
      <Turnstile
        siteKey={siteKey}
        onSuccess={handleSuccess}
        onError={handleError}
        options={{
          theme: 'light',
          size: 'normal',
          // Use 'invisible' for automatic verification
          // Use 'managed' for interactive challenge when needed
          action: 'participate',
          cData: 'research-participant',
        }}
      />
    </div>
  );
};
