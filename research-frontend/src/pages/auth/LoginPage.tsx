import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { configService } from '../../services/api/config.service';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
    const navigate = useNavigate();
    const { login, isLoading, error } = useAuthStore();

    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            rememberMe: false,
        },
    });

    const onSubmit = async (data: LoginForm) => {
        try {
            await login(
                {
                    email: data.email,
                    password: data.password,
                },
                data.rememberMe ?? false
            );
            navigate('/dashboard');
        } catch {
            // Error is handled by store
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const baseUrl = configService.getBaseUrl();
            // Pass current origin as query parameter since browser doesn't send Origin header on navigation
            const currentOrigin = encodeURIComponent(window.location.origin);
            // Redirect to Google OAuth endpoint
            window.location.href = `${baseUrl}/auth/google?redirect_origin=${currentOrigin}`;
        } catch (error) {
            console.error('Error initiating Google login:', error);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h1 className="text-center text-3xl font-semibold tracking-tight text-gray-800 pb-4">
                Emotiox
            </h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                <Input
                    id="email"
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    error={errors.email?.message}
                />

                <Input
                    id="password"
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    {...register('password')}
                    error={errors.password?.message}
                />

                <Checkbox
                    id="rememberMe"
                    label="Remember me"
                    description="Stay signed in on this device"
                    {...register('rememberMe')}
                />

                <Button type="submit" className="w-full" isLoading={isLoading}>
                    Sign in
                </Button>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Continue with Google
                </button>

                <div className="text-center text-sm pt-2">
                    <span className="text-gray-500">Don't have an account? </span>
                    <Link to="/register" className="font-medium text-blue-500 hover:text-blue-600">
                        Register here
                    </Link>
                </div>
            </form>
        </div>
    );
};
