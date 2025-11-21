import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const registerSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain uppercase letter')
        .regex(/[0-9]/, 'Must contain number')
        .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export const RegisterPage = () => {
    const navigate = useNavigate();
    const { register: registerUser, isLoading, error } = useAuthStore();

    const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterForm) => {
        try {
            await registerUser({
                email: data.email,
                password: data.password,
                firstName: data.firstName,
                lastName: data.lastName,
            });
            // Auto login or redirect to login
            navigate('/login');
        } catch (err) {
            // Error handled by store
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-gray-800 text-center">
                    Create your account
                </h1>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        id="firstName"
                        label="First Name"
                        {...register('firstName')}
                        error={errors.firstName?.message}
                    />
                    <Input
                        id="lastName"
                        label="Last Name"
                        {...register('lastName')}
                        error={errors.lastName?.message}
                    />
                </div>

                <Input
                    id="email"
                    label="Email address"
                    type="email"
                    {...register('email')}
                    error={errors.email?.message}
                />

                <Input
                    id="password"
                    label="Password"
                    type="password"
                    {...register('password')}
                    error={errors.password?.message}
                />

                <Input
                    id="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    {...register('confirmPassword')}
                    error={errors.confirmPassword?.message}
                />

                <Button type="submit" className="w-full" isLoading={isLoading}>
                    Create Account
                </Button>

                <div className="text-center text-sm pt-2">
                    <span className="text-gray-500">Already have an account? </span>
                    <Link to="/login" className="font-medium text-blue-500 hover:text-blue-600">
                        Sign in here
                    </Link>
                </div>
            </form>
        </div>
    );
};
