import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
    const navigate = useNavigate();
    const { login, isLoading, error } = useAuthStore();

    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        try {
            await login(data);
            navigate('/dashboard');
        } catch (err) {
            // Error is handled by store
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-gray-800 text-center">
                    Sign in to your account
                </h1>
            </div>
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

                <Button type="submit" className="w-full" isLoading={isLoading}>
                    Sign in
                </Button>

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
